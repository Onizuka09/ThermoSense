document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const statusIndicator = document.getElementById('status-indicator');
    const statusText = document.getElementById('status-text');
    const toggleCameraBtn = document.getElementById('toggle-camera');
    const captureBtn = document.getElementById('capture-btn');
    const panoramaBtn = document.getElementById('panorama-btn');
    const stopPanoramaBtn = document.getElementById('stop-panorama-btn');
    const intervalSlider = document.getElementById('interval-slider');
    const intervalValue = document.getElementById('interval-value');
    const maxPicsSlider = document.getElementById('max-pics-slider');
    const maxPicsValue = document.getElementById('max-pics-value');
    const thermalCanvas = document.getElementById('thermal-canvas');
    const noFeedMessage = document.getElementById('no-feed');
    const panoramaProgress = document.getElementById('panorama-progress');
    const panoramaProgressBar = document.getElementById('panorama-progress-bar');
    const panoramaCount = document.getElementById('panorama-count');
    const imageGallery = document.getElementById('image-gallery');
    const minTempInput = document.getElementById('min-temp');
    const maxTempInput = document.getElementById('max-temp');

    // State variables
    let isCameraOn = false;
    let isPanoramaMode = false;
    let panoramaInterval;
    let picturesTaken = 0;
    let maxPictures = parseInt(maxPicsSlider.value);
    let captureInterval = parseInt(intervalSlider.value) * 1000;
    let minTemp = parseFloat(minTempInput.value);
    let maxTemp = parseFloat(maxTempInput.value);

    // Simulated thermal data (replace with actual camera data)
    let thermalData = new Array(64).fill(25);

    // Update slider value displays
    intervalSlider.addEventListener('input', function() {
        intervalValue.textContent = this.value;
        captureInterval = parseInt(this.value) * 1000;
    });

    maxPicsSlider.addEventListener('input', function() {
        maxPicsValue.textContent = this.value;
        maxPictures = parseInt(this.value);
    });

    // Temperature range updates
    minTempInput.addEventListener('change', function() {
        minTemp = parseFloat(this.value);
        renderThermalImage();
    });

    maxTempInput.addEventListener('change', function() {
        maxTemp = parseFloat(this.value);
        renderThermalImage();
    });

    // Camera toggle
    toggleCameraBtn.addEventListener('click', function() {
        isCameraOn = !isCameraOn;
        
        if (isCameraOn) {
            // Simulate camera connection
            setTimeout(() => {
                statusIndicator.classList.remove('offline');
                statusIndicator.classList.add('online');
                statusText.textContent = 'Camera Online';
                toggleCameraBtn.textContent = 'Stop Camera';
                captureBtn.disabled = false;
                panoramaBtn.disabled = false;
                noFeedMessage.classList.add('hidden');
                
                // Start simulated data updates
                simulateThermalData();
                renderThermalImage();
            }, 500);
        } else {
            // Stop camera
            statusIndicator.classList.remove('online');
            statusIndicator.classList.add('offline');
            statusText.textContent = 'Camera Offline';
            toggleCameraBtn.textContent = 'Start Camera';
            captureBtn.disabled = true;
            panoramaBtn.disabled = true;
            noFeedMessage.classList.remove('hidden');
            
            // Stop panorama if running
            if (isPanoramaMode) {
                stopPanorama();
            }
            
            // Clear any intervals
            clearInterval(thermalUpdateInterval);
        }
    });

    // Capture single image
    captureBtn.addEventListener('click', function() {
        if (isCameraOn) {
            const imgData = thermalCanvas.toDataURL('image/png');
            addImageToGallery(imgData);
        }
    });

    // Panorama mode
    panoramaBtn.addEventListener('click', startPanorama);
    stopPanoramaBtn.addEventListener('click', stopPanorama);

    function startPanorama() {
        if (!isPanoramaMode) {
            isPanoramaMode = true;
            picturesTaken = 0;
            panoramaBtn.disabled = true;
            stopPanoramaBtn.disabled = false;
            panoramaProgress.classList.remove('hidden');
            
            // Update progress display
            updatePanoramaProgress();
            
            // Take first picture immediately
            takePanoramaPicture();
            
            // Set interval for subsequent pictures
            panoramaInterval = setInterval(() => {
                takePanoramaPicture();
            }, captureInterval);
        }
    }

    function stopPanorama() {
        if (isPanoramaMode) {
            isPanoramaMode = false;
            clearInterval(panoramaInterval);
            panoramaBtn.disabled = false;
            stopPanoramaBtn.disabled = true;
        }
    }

    function takePanoramaPicture() {
        if (picturesTaken < maxPictures) {
            const imgData = thermalCanvas.toDataURL('image/png');
            addImageToGallery(imgData);
            picturesTaken++;
            updatePanoramaProgress();
            
            if (picturesTaken >= maxPictures) {
                stopPanorama();
            }
        }
    }

    function updatePanoramaProgress() {
        const progress = (picturesTaken / maxPictures) * 100;
        panoramaProgressBar.value = progress;
        panoramaCount.textContent = `${picturesTaken}/${maxPictures} pictures taken`;
    }

    function addImageToGallery(imgData) {
        const imgElement = document.createElement('img');
        imgElement.src = imgData;
        imgElement.title = `Capture ${new Date().toLocaleTimeString()}`;
        
        // Add click to enlarge functionality
        imgElement.addEventListener('click', function() {
            const enlargedView = document.createElement('div');
            enlargedView.style.position = 'fixed';
            enlargedView.style.top = '0';
            enlargedView.style.left = '0';
            enlargedView.style.width = '100%';
            enlargedView.style.height = '100%';
            enlargedView.style.backgroundColor = 'rgba(0,0,0,0.8)';
            enlargedView.style.display = 'flex';
            enlargedView.style.justifyContent = 'center';
            enlargedView.style.alignItems = 'center';
            enlargedView.style.zIndex = '1000';
            
            const enlargedImg = document.createElement('img');
            enlargedImg.src = imgData;
            enlargedImg.style.maxWidth = '90%';
            enlargedImg.style.maxHeight = '90%';
            
            enlargedView.appendChild(enlargedImg);
            enlargedView.addEventListener('click', function() {
                document.body.removeChild(enlargedView);
            });
            
            document.body.appendChild(enlargedView);
        });
        
        imageGallery.appendChild(imgElement);
    }

    // Thermal image rendering
    function renderThermalImage() {
        const ctx = thermalCanvas.getContext('2d');
        const cellSize = thermalCanvas.width / 8;
        
        // Clear canvas
        ctx.clearRect(0, 0, thermalCanvas.width, thermalCanvas.height);
        
        // Draw each pixel
        for (let y = 0; y < 8; y++) {
            for (let x = 0; x < 8; x++) {
                const index = y * 8 + x;
                const temp = thermalData[index];
                
                // Calculate color based on temperature
                const normalizedTemp = Math.min(Math.max((temp - minTemp) / (maxTemp - minTemp), 0), 1);
                const color = getTemperatureColor(normalizedTemp);
                
                // Draw the pixel
                ctx.fillStyle = color;
                ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
                
                // Optional: Draw temperature text
                if (cellSize > 30) { // Only if cells are large enough
                    ctx.fillStyle = 'white';
                    ctx.font = `${Math.floor(cellSize/3)}px Arial`;
                    ctx.textAlign = 'center';
                    ctx.fillText(
                        temp.toFixed(1),
                        x * cellSize + cellSize/2,
                        y * cellSize + cellSize/2 + cellSize/6
                    );
                }
            }
        }
    }

    // Color mapping for temperatures
    function getTemperatureColor(normalizedValue) {
        // Simple gradient from blue (cold) to red (hot)
        const r = Math.floor(normalizedValue * 255);
        const b = Math.floor((1 - normalizedValue) * 255);
        return `rgb(${r}, 0, ${b})`;
    }

    // Simulate thermal data updates (replace with real camera data)
    let thermalUpdateInterval;
    function simulateThermalData() {
        // Clear any existing interval
        clearInterval(thermalUpdateInterval);
        
        // Generate random thermal data
        thermalUpdateInterval = setInterval(() => {
            // Base temperature
            const baseTemp = 25 + Math.sin(Date.now() / 5000) * 5;
            
            // Generate random heat spots
            const heatSpots = [
                {x: Math.floor(Math.random() * 8), y: Math.floor(Math.random() * 8), temp: 35 + Math.random() * 10},
                {x: Math.floor(Math.random() * 8), y: Math.floor(Math.random() * 8), temp: 35 + Math.random() * 10}
            ];
            
            // Update thermal data
            for (let y = 0; y < 8; y++) {
                for (let x = 0; x < 8; x++) {
                    const index = y * 8 + x;
                    let temp = baseTemp + Math.random() * 2 - 1; // Random variation
                    
                    // Apply heat spots
                    for (const spot of heatSpots) {
                        const distance = Math.sqrt(Math.pow(x - spot.x, 2) + Math.pow(y - spot.y, 2));
                        if (distance < 2) {
                            temp = spot.temp - distance * 2;
                        }
                    }
                    
                    thermalData[index] = temp;
                }
            }
            
            renderThermalImage();
        }, 500);
    }
});