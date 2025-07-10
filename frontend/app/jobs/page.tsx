"use client";

import JobStatusTable from "@/components/JobStatusTable";
import { Container, Typography, Box } from '@mui/material';

export default function JobsPage() {
  return (
    <Container maxWidth="lg">
      <Box sx={{ my: 4, textAlign: 'center' }}>
        <Typography variant="h4" component="h1" gutterBottom>
          My Conversion Jobs
        </Typography>
        <Typography variant="subtitle1" gutterBottom>
          Track the status of your file conversions.
        </Typography>
      </Box>
      <JobStatusTable />
    </Container>
  );
}
