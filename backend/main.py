from fastapi import FastAPI, UploadFile, File, HTTPException, BackgroundTasks, Depends, Query
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
import asyncio
import logging
from datetime import datetime, timedelta
import hashlib
import mimetypes
from contextlib import asynccontextmanager
import aiofiles
import aiofiles.os
from pathlib import Path
import shutil

# Third-party conversion libraries
from pdf2docx import Converter
from docx2pdf import convert
from moviepy.video.io.VideoFileClip import VideoFileClip
from PIL import Image, ImageEnhance, ImageFilter
from pydub import AudioSegment
import csv
import json
import uuid
import os
import zipfile
import tempfile
import subprocess
from dataclasses import dataclass
from enum import Enum
import redis
from sqlalchemy import create_engine, Column, String, DateTime, Integer, Boolean, Float
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.sql import func

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Database setup
SQLALCHEMY_DATABASE_URL = "sqlite:///./conversions.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Redis setup for caching and rate limiting
try:
    redis_client = redis.Redis(host='localhost', port=6379, db=0, decode_responses=True)
    redis_client.ping()
    REDIS_AVAILABLE = True
except:
    REDIS_AVAILABLE = False
    logger.warning("Redis not available. Caching and rate limiting disabled.")

# Models
class ConversionRecord(Base):
    __tablename__ = "conversions"
    
    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, index=True)
    input_filename = Column(String)
    output_filename = Column(String)
    conversion_type = Column(String)
    file_size = Column(Integer)
    processing_time = Column(Float)
    status = Column(String)
    created_at = Column(DateTime, default=func.now())
    expires_at = Column(DateTime)

Base.metadata.create_all(bind=engine)

# Pydantic models
class ConversionStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"

class ConversionResponse(BaseModel):
    job_id: str
    status: ConversionStatus
    download_url: Optional[str] = None
    message: Optional[str] = None
    processing_time: Optional[float] = None
    file_size: Optional[int] = None

class ConversionJob(BaseModel):
    id: str
    status: ConversionStatus
    input_filename: str
    output_filename: Optional[str] = None
    conversion_type: str
    created_at: datetime
    expires_at: datetime
    progress: Optional[float] = None

class ImageProcessingOptions(BaseModel):
    width: Optional[int] = None
    height: Optional[int] = None
    quality: Optional[int] = 85
    brightness: Optional[float] = None
    contrast: Optional[float] = None
    blur: Optional[float] = None
    sharpen: Optional[bool] = False
    grayscale: Optional[bool] = False

class VideoProcessingOptions(BaseModel):
    start_time: Optional[float] = None
    end_time: Optional[float] = None
    fps: Optional[int] = None
    bitrate: Optional[str] = None
    resolution: Optional[str] = None

class AudioProcessingOptions(BaseModel):
    bitrate: Optional[str] = None
    sample_rate: Optional[int] = None
    channels: Optional[int] = None
    normalize: Optional[bool] = False

# Security
security = HTTPBearer(auto_error=False)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if credentials:
        # In production, validate JWT token here
        return credentials.credentials
    return "anonymous"

# Rate limiting
async def rate_limit_check(user_id: str, limit: int = 100, window: int = 3600):
    if not REDIS_AVAILABLE:
        return True
    
    key = f"rate_limit:{user_id}"
    current = redis_client.get(key)
    
    if current is None:
        redis_client.setex(key, window, 1)
        return True
    elif int(current) < limit:
        redis_client.incr(key)
        return True
    else:
        return False

# File management
@dataclass
class FileManager:
    base_path: Path = Path("converted")
    max_file_size: int = 100 * 1024 * 1024  # 100MB
    allowed_extensions: Dict[str, List[str]] = None
    
    def __post_init__(self):
        self.base_path.mkdir(exist_ok=True)
        if self.allowed_extensions is None:
            self.allowed_extensions = {
                'document': ['.pdf', '.docx', '.doc', '.txt', '.rtf'],
                'image': ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.tiff'],
                'video': ['.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm'],
                'audio': ['.mp3', '.wav', '.flac', '.aac', '.ogg'],
                'data': ['.csv', '.json', '.xml', '.xlsx']
            }
    
    async def save_file(self, file: UploadFile, filename: str) -> Path:
        file_path = self.base_path / filename
        
        # Check file size
        content = await file.read()
        if len(content) > self.max_file_size:
            raise HTTPException(status_code=413, detail="File too large")
        
        async with aiofiles.open(file_path, 'wb') as f:
            await f.write(content)
        
        return file_path
    
    async def cleanup_old_files(self, days: int = 1):
        cutoff_time = datetime.now() - timedelta(days=days)
        for file_path in self.base_path.iterdir():
            if file_path.is_file():
                file_time = datetime.fromtimestamp(file_path.stat().st_mtime)
                if file_time < cutoff_time:
                    await aiofiles.os.remove(file_path)

file_manager = FileManager()

# Background task for cleanup
async def cleanup_task():
    while True:
        await file_manager.cleanup_old_files()
        await asyncio.sleep(3600)  # Run every hour

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Start cleanup task
    cleanup_task_handle = asyncio.create_task(cleanup_task())
    yield
    # Cleanup on shutdown
    cleanup_task_handle.cancel()

# FastAPI app
app = FastAPI(
    title="Advanced File Conversion API",
    description="A robust, scalable file conversion platform with advanced features",
    version="2.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Conversion utilities
class ConversionEngine:
    @staticmethod
    async def convert_pdf_to_docx(input_path: Path, output_path: Path) -> None:
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, ConversionEngine._pdf_to_docx_sync, input_path, output_path)
    
    @staticmethod
    def _pdf_to_docx_sync(input_path: Path, output_path: Path):
        cv = Converter(str(input_path))
        cv.convert(str(output_path))
        cv.close()
    
    @staticmethod
    async def convert_docx_to_pdf(input_path: Path, output_path: Path) -> None:
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, convert, str(input_path), str(output_path))
    
    @staticmethod
    async def convert_video_to_audio(input_path: Path, output_path: Path, options: VideoProcessingOptions = None) -> None:
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, ConversionEngine._video_to_audio_sync, input_path, output_path, options)
    
    @staticmethod
    def _video_to_audio_sync(input_path: Path, output_path: Path, options: VideoProcessingOptions):
        video = VideoFileClip(str(input_path))
        
        if options:
            if options.start_time is not None or options.end_time is not None:
                video = video.subclip(options.start_time, options.end_time)
        
        audio = video.audio
        audio.write_audiofile(str(output_path), verbose=False, logger=None)
        video.close()
    
    @staticmethod
    async def process_image(input_path: Path, output_path: Path, options: ImageProcessingOptions) -> None:
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, ConversionEngine._process_image_sync, input_path, output_path, options)
    
    @staticmethod
    def _process_image_sync(input_path: Path, output_path: Path, options: ImageProcessingOptions):
        image = Image.open(input_path)
        
        # Apply transformations
        if options.grayscale:
            image = image.convert('L')
        
        if options.width or options.height:
            size = (options.width or image.width, options.height or image.height)
            image = image.resize(size, Image.Resampling.LANCZOS)
        
        if options.brightness:
            enhancer = ImageEnhance.Brightness(image)
            image = enhancer.enhance(options.brightness)
        
        if options.contrast:
            enhancer = ImageEnhance.Contrast(image)
            image = enhancer.enhance(options.contrast)
        
        if options.blur:
            image = image.filter(ImageFilter.GaussianBlur(radius=options.blur))
        
        if options.sharpen:
            image = image.filter(ImageFilter.SHARPEN)
        
        # Save with quality setting
        save_kwargs = {}
        if output_path.suffix.lower() in ['.jpg', '.jpeg']:
            save_kwargs['quality'] = options.quality
            save_kwargs['optimize'] = True
        
        image.save(output_path, **save_kwargs)
    
    @staticmethod
    async def process_audio(input_path: Path, output_path: Path, options: AudioProcessingOptions) -> None:
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, ConversionEngine._process_audio_sync, input_path, output_path, options)
    
    @staticmethod
    def _process_audio_sync(input_path: Path, output_path: Path, options: AudioProcessingOptions):
        audio = AudioSegment.from_file(input_path)
        
        if options.sample_rate:
            audio = audio.set_frame_rate(options.sample_rate)
        
        if options.channels:
            audio = audio.set_channels(options.channels)
        
        if options.normalize:
            audio = audio.normalize()
        
        export_kwargs = {}
        if options.bitrate:
            export_kwargs['bitrate'] = options.bitrate
        
        audio.export(output_path, format=output_path.suffix[1:], **export_kwargs)

conversion_engine = ConversionEngine()

# Job management
async def create_conversion_job(
    user_id: str, 
    input_filename: str, 
    conversion_type: str,
    db: Session
) -> str:
    job_id = str(uuid.uuid4())
    expires_at = datetime.now() + timedelta(hours=24)
    
    job = ConversionRecord(
        id=job_id,
        user_id=user_id,
        input_filename=input_filename,
        conversion_type=conversion_type,
        status=ConversionStatus.PENDING,
        created_at=datetime.now(),
        expires_at=expires_at
    )
    
    db.add(job)
    db.commit()
    
    return job_id

async def update_job_status(job_id: str, status: ConversionStatus, db: Session, **kwargs):
    job = db.query(ConversionRecord).filter(ConversionRecord.id == job_id).first()
    if job:
        job.status = status
        for key, value in kwargs.items():
            setattr(job, key, value)
        db.commit()

# Routes
@app.get("/")
async def root():
    return {
        "message": "Advanced File Conversion API",
        "version": "2.0.0",
        "features": [
            "Asynchronous processing",
            "Job tracking",
            "Rate limiting",
            "File caching",
            "Batch processing",
            "Advanced image/video/audio processing"
        ]
    }

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "redis_available": REDIS_AVAILABLE
    }

@app.post("/convert/pdf-to-docx", response_model=ConversionResponse)
async def convert_pdf_to_docx(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not await rate_limit_check(user_id):
        raise HTTPException(status_code=429, detail="Rate limit exceeded")
    
    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Invalid file type. Please upload a PDF file.")
    
    job_id = await create_conversion_job(user_id, file.filename, "pdf_to_docx", db)
    
    background_tasks.add_task(
        process_pdf_to_docx_conversion,
        job_id, file, db
    )
    
    return ConversionResponse(
        job_id=job_id,
        status=ConversionStatus.PENDING,
        message="Conversion job started"
    )

async def process_pdf_to_docx_conversion(job_id: str, file: UploadFile, db: Session):
    start_time = datetime.now()
    
    try:
        await update_job_status(job_id, ConversionStatus.PROCESSING, db)
        
        # Save input file
        input_filename = f"{job_id}.pdf"
        output_filename = f"{job_id}.docx"
        
        input_path = await file_manager.save_file(file, input_filename)
        output_path = file_manager.base_path / output_filename
        
        # Convert
        await conversion_engine.convert_pdf_to_docx(input_path, output_path)
        
        # Update job
        processing_time = (datetime.now() - start_time).total_seconds()
        file_size = output_path.stat().st_size
        
        await update_job_status(
            job_id, 
            ConversionStatus.COMPLETED, 
            db,
            output_filename=output_filename,
            processing_time=processing_time,
            file_size=file_size
        )
        
        # Cleanup input file
        await aiofiles.os.remove(input_path)
        
    except Exception as e:
        logger.error(f"Conversion failed for job {job_id}: {str(e)}")
        await update_job_status(job_id, ConversionStatus.FAILED, db)

@app.post("/convert/batch", response_model=List[ConversionResponse])
async def batch_convert(
    background_tasks: BackgroundTasks,
    files: List[UploadFile] = File(...),
    conversion_type: str = Query(..., description="Type of conversion (e.g., 'pdf_to_docx')"),
    user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not await rate_limit_check(user_id, limit=50):
        raise HTTPException(status_code=429, detail="Rate limit exceeded")
    
    if len(files) > 10:
        raise HTTPException(status_code=400, detail="Maximum 10 files per batch")
    
    responses = []
    for file in files:
        job_id = await create_conversion_job(user_id, file.filename, conversion_type, db)
        
        # Add appropriate background task based on conversion type
        if conversion_type == "pdf_to_docx":
            background_tasks.add_task(process_pdf_to_docx_conversion, job_id, file, db)
        elif conversion_type == "docx_to_pdf":
            background_tasks.add_task(process_docx_to_pdf_conversion, job_id, file, db)
        elif conversion_type == "mp4_to_mp3":
            background_tasks.add_task(process_mp4_to_mp3_conversion, job_id, file, db)
        elif conversion_type == "png_to_jpg":
            background_tasks.add_task(process_png_to_jpg_conversion, job_id, file, db)
        elif conversion_type == "wav_to_mp3":
            background_tasks.add_task(process_wav_to_mp3_conversion, job_id, file, db)
        elif conversion_type == "csv_to_json":
            background_tasks.add_task(process_csv_to_json_conversion, job_id, file, db)
        elif conversion_type == "jpg_to_png":
            background_tasks.add_task(process_jpg_to_png_conversion, job_id, file, db)
        elif conversion_type == "json_to_csv":
            background_tasks.add_task(process_json_to_csv_conversion, job_id, file, db)
        elif conversion_type == "mp3_to_wav":
            background_tasks.add_task(process_mp3_to_wav_conversion, job_id, file, db)
        else:
            raise HTTPException(status_code=400, detail=f"Unsupported conversion type: {conversion_type}")
        
        responses.append(ConversionResponse(
            job_id=job_id,
            status=ConversionStatus.PENDING,
            message=f"Batch conversion job started for {file.filename}"
        ))
    
    return responses

@app.post("/image/process", response_model=ConversionResponse)
async def process_image_advanced(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    options: ImageProcessingOptions = ImageProcessingOptions(),
    output_format: str = Query("png", description="Output format (jpg, png, webp)"),
    user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not await rate_limit_check(user_id):
        raise HTTPException(status_code=429, detail="Rate limit exceeded")
    
    if file.content_type not in ["image/jpeg", "image/png", "image/gif", "image/bmp", "image/webp"]:
        raise HTTPException(status_code=400, detail="Invalid file type")
    
    job_id = await create_conversion_job(user_id, file.filename, f"image_process_{output_format}", db)
    
    background_tasks.add_task(
        process_image_job,
        job_id, file, options, output_format, db
    )
    
    return ConversionResponse(
        job_id=job_id,
        status=ConversionStatus.PENDING,
        message="Image processing job started"
    )

async def process_image_job(
    job_id: str, 
    file: UploadFile, 
    options: ImageProcessingOptions,
    output_format: str,
    db: Session
):
    start_time = datetime.now()
    
    try:
        await update_job_status(job_id, ConversionStatus.PROCESSING, db)
        
        # Save input file
        input_filename = f"{job_id}_input{Path(file.filename).suffix}"
        output_filename = f"{job_id}.{output_format}"
        
        input_path = await file_manager.save_file(file, input_filename)
        output_path = file_manager.base_path / output_filename
        
        # Process image
        await conversion_engine.process_image(input_path, output_path, options)
        
        # Update job
        processing_time = (datetime.now() - start_time).total_seconds()
        file_size = output_path.stat().st_size
        
        await update_job_status(
            job_id, 
            ConversionStatus.COMPLETED, 
            db,
            output_filename=output_filename,
            processing_time=processing_time,
            file_size=file_size
        )
        
        # Cleanup input file
        await aiofiles.os.remove(input_path)
        
    except Exception as e:
        logger.error(f"Image processing failed for job {job_id}: {str(e)}")
        await update_job_status(job_id, ConversionStatus.FAILED, db)

async def process_mp3_to_wav_conversion(job_id: str, file: UploadFile, db: Session):
    start_time = datetime.now()

    try:
        await update_job_status(job_id, ConversionStatus.PROCESSING, db)

        # Save input file
        input_filename = f"{job_id}.mp3"
        output_filename = f"{job_id}.wav"

        input_path = await file_manager.save_file(file, input_filename)
        output_path = file_manager.base_path / output_filename

        # Convert
        await conversion_engine.process_audio(input_path, output_path, AudioProcessingOptions(format="wav"))

        # Update job
        processing_time = (datetime.now() - start_time).total_seconds()
        file_size = output_path.stat().st_size

        await update_job_status(
            job_id,
            ConversionStatus.COMPLETED,
            db,
            output_filename=output_filename,
            processing_time=processing_time,
            file_size=file_size
        )

        # Cleanup input file
        await aiofiles.os.remove(input_path)

    except Exception as e:
        logger.error(f"Conversion failed for job {job_id}: {str(e)}")
        await update_job_status(job_id, ConversionStatus.FAILED, db)

@app.get("/job/{job_id}", response_model=ConversionResponse)
async def get_job_status(job_id: str, db: Session = Depends(get_db)):
    job = db.query(ConversionRecord).filter(ConversionRecord.id == job_id).first()
    
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    response = ConversionResponse(
        job_id=job.id,
        status=job.status,
        processing_time=job.processing_time,
        file_size=job.file_size
    )
    
    if job.status == ConversionStatus.COMPLETED and job.output_filename:
        response.download_url = f"/download/{job.output_filename}"
    
    return response

@app.get("/jobs", response_model=List[ConversionResponse])
async def get_user_jobs(
    user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
    limit: int = Query(10, le=100),
    offset: int = Query(0, ge=0)
):
    jobs = db.query(ConversionRecord).filter(
        ConversionRecord.user_id == user_id
    ).offset(offset).limit(limit).all()
    
    return [
        ConversionResponse(
            job_id=job.id,
            status=job.status,
            processing_time=job.processing_time,
            file_size=job.file_size,
            download_url=f"/download/{job.output_filename}" if job.output_filename else None
        )
        for job in jobs
    ]

@app.get("/download/{filename}")
async def download_file(filename: str):
    file_path = file_manager.base_path / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    
    return FileResponse(
        file_path, 
        filename=filename,
        headers={"Cache-Control": "public, max-age=3600"}
    )

@app.delete("/job/{job_id}")
async def delete_job(
    job_id: str,
    user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    job = db.query(ConversionRecord).filter(
        ConversionRecord.id == job_id,
        ConversionRecord.user_id == user_id
    ).first()
    
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    # Delete associated files
    if job.output_filename:
        output_path = file_manager.base_path / job.output_filename
        if output_path.exists():
            await aiofiles.os.remove(output_path)
    
    # Delete job record
    db.delete(job)
    db.commit()
    
    return {"message": "Job deleted successfully"}

@app.get("/stats")
async def get_conversion_stats(
    user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    total_jobs = db.query(ConversionRecord).filter(ConversionRecord.user_id == user_id).count()
    completed_jobs = db.query(ConversionRecord).filter(
        ConversionRecord.user_id == user_id,
        ConversionRecord.status == ConversionStatus.COMPLETED
    ).count()
    
    return {
        "total_jobs": total_jobs,
        "completed_jobs": completed_jobs,
        "success_rate": (completed_jobs / total_jobs * 100) if total_jobs > 0 else 0
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)