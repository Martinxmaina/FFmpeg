const express = require('express');
const { spawn } = require('child_process');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Configure multer for file uploads
const upload = multer({ 
    dest: 'uploads/',
    limits: {
        fileSize: 100 * 1024 * 1024 // 100MB limit
    }
});

// Test FFmpeg on startup
function testFFmpeg() {
    return new Promise((resolve, reject) => {
        const ffmpeg = spawn('ffmpeg', ['-version']);
        
        let output = '';
        
        ffmpeg.stdout.on('data', (data) => {
            output += data.toString();
        });
        
        ffmpeg.stderr.on('data', (data) => {
            output += data.toString();
        });
        
        ffmpeg.on('close', (code) => {
            if (code === 0) {
                console.log('✅ FFmpeg is working!');
                console.log('📹', output.split('\n')[0]);
                resolve(true);
            } else {
                console.error('❌ FFmpeg test failed');
                reject(false);
            }
        });
        
        ffmpeg.on('error', (err) => {
            console.error('❌ FFmpeg not found:', err.message);
            reject(false);
        });
    });
}

// Routes
app.get('/', (req, res) => {
    res.json({
        message: 'FFmpeg + Railway API is running!',
        status: 'healthy',
        timestamp: new Date().toISOString(),
        endpoints: {
            'GET /': 'This info',
            'GET /health': 'Health check with FFmpeg status',
            'POST /convert': 'Convert video file (multipart/form-data)',
            'GET /ffmpeg-info': 'FFmpeg version and codec info'
        }
    });
});

app.get('/health', async (req, res) => {
    try {
        await testFFmpeg();
        res.json({ 
            status: 'healthy', 
            ffmpeg: 'available',
            timestamp: new Date().toISOString(),
            uptime: process.uptime()
        });
    } catch (error) {
        res.status(500).json({ 
            status: 'unhealthy', 
            ffmpeg: 'unavailable',
            error: 'FFmpeg not working',
            timestamp: new Date().toISOString()
        });
    }
});

app.get('/ffmpeg-info', (req, res) => {
    const ffmpeg = spawn('ffmpeg', ['-version']);
    let output = '';
    
    ffmpeg.stdout.on('data', (data) => {
        output += data.toString();
    });
    
    ffmpeg.stderr.on('data', (data) => {
        output += data.toString();
    });
    
    ffmpeg.on('close', (code) => {
        if (code === 0) {
            const lines = output.split('\n');
            res.json({
                success: true,
                version: lines[0],
                configuration: lines.find(line => line.includes('configuration:')) || 'Not found',
                libraries: lines.filter(line => line.includes('lib')).slice(0, 5)
            });
        } else {
            res.status(500).json({
                success: false,
                error: 'Could not get FFmpeg info'
            });
        }
    });
    
    ffmpeg.on('error', (err) => {
        res.status(500).json({
            success: false,
            error: err.message
        });
    });
});

app.post('/convert', upload.single('video'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const inputPath = req.file.path;
    const outputPath = `uploads/converted_${Date.now()}.mp4`;
    
    console.log(`Converting: ${inputPath} -> ${outputPath}`);
    
    const ffmpeg = spawn('ffmpeg', [
        '-i', inputPath,
        '-c:v', 'libx264',
        '-c:a', 'aac',
        '-preset', 'fast',
        '-crf', '23',
        '-y', // overwrite output
        outputPath
    ]);
    
    let progress = '';
    
    ffmpeg.stderr.on('data', (data) => {
        progress += data.toString();
        // Only log important progress info
        const dataStr = data.toString();
        if (dataStr.includes('time=') || dataStr.includes('error')) {
            console.log('FFmpeg progress:', dataStr.trim());
        }
    });
    
    ffmpeg.on('close', (code) => {
        // Clean up input file
        fs.unlink(inputPath, (err) => {
            if (err) console.error('Error deleting input file:', err);
        });
        
        if (code === 0) {
            res.json({
                success: true,
                message: 'Video converted successfully',
                outputFile: path.basename(outputPath),
                downloadUrl: `/download/${path.basename(outputPath)}`
            });
        } else {
            res.status(500).json({
                success: false,
                error: `Conversion failed with exit code ${code}`,
                details: progress.split('\n').slice(-5).join('\n') // Last 5 lines only
            });
        }
    });
    
    ffmpeg.on('error', (err) => {
        fs.unlink(inputPath, () => {}); // cleanup
        res.status(500).json({
            success: false,
            error: 'FFmpeg process error',
            details: err.message
        });
    });
});

app.get('/download/:filename', (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(__dirname, 'uploads', filename);
    
    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'File not found' });
    }
    
    res.download(filePath, (err) => {
        if (err) {
            console.error('Download error:', err);
        } else {
            // Delete file after download
            setTimeout(() => {
                fs.unlink(filePath, (err) => {
                    if (err) console.error('Error deleting file:', err);
                });
            }, 1000);
        }
    });
});

// Create uploads directory if it doesn't exist
if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads');
}

// Start server
const server = app.listen(PORT, async () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📡 Environment: ${process.env.NODE_ENV || 'development'}`);
    
    if (process.env.RAILWAY_PUBLIC_DOMAIN) {
        console.log(`🌐 Public URL: https://${process.env.RAILWAY_PUBLIC_DOMAIN}`);
    }
    
    try {
        await testFFmpeg();
        console.log('🎬 FFmpeg is ready for video processing!');
    } catch (error) {
        console.error('⚠️  FFmpeg setup failed - video processing will not work');
    }
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('Received SIGTERM, shutting down gracefully');
    server.close(() => {
        console.log('Process terminated');
    });
});

process.on('SIGINT', () => {
    console.log('Received SIGINT, shutting down gracefully');
    server.close(() => {
        console.log('Process terminated');
    });
});
