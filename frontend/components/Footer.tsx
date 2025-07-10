import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

export default function Footer() {
  return (
    <Box sx={{ bgcolor: 'primary.main', color: 'white', p: 2, mt: 'auto' }}>
      <Typography variant="body2" align="center">
        © {new Date().getFullYear()} File Converter. All rights reserved.
      </Typography>
    </Box>
  );
}