document.addEventListener('DOMContentLoaded', () => {
    const downloadBtn = document.getElementById('downloadBtn');
    const manhwaNameInput = document.getElementById('manhwaName');
    const episodeNumberInput = document.getElementById('episodeNumber');
    const progressContainer = document.querySelector('.progress-container');
    const progressFill = document.querySelector('.progress-fill');
    const progressPercentage = document.querySelector('.progress-percentage');
  
    function updateProgress(progress) {
      progressFill.style.width = `${progress}%`;
      progressPercentage.textContent = `${Math.round(progress)}%`;
      console.log(`Progress updated to ${progress}%`);
    }
  
    function resetUI() {
      downloadBtn.disabled = false;
      downloadBtn.innerText = "Download Episode";
      progressContainer.style.display = 'none';
      updateProgress(0);
      console.log("UI reset");
    }
  
    async function fetchImages(manhwaName, episodeNumber) {
      console.log(`Fetching images for ${manhwaName}, Episode ${episodeNumber}`);
      const response = await fetch('https://manhwa-downloader-backend-production.up.railway.app/download', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mangaName: manhwaName, episodeNum: episodeNumber }),
      });
  
      if (!response.ok) {
        const result = await response.json();
        console.log(`Fetch failed with error: ${result.error}`);
        if (response.status === 503) {
          throw new Error(result.error);
        } else {
          throw new Error(result.error);
        }
      }
  
      const { images } = await response.json();
      console.log(`Received ${images.length} base64 images from backend`);
      return images;
    }
  
    async function loadImages(imagesBase64) {
      console.log("Starting to process base64 images...");
      const imagesData = [];
      for (let i = 0; i < imagesBase64.length; i++) {
        const img = new Image();
        img.src = imagesBase64[i];
        await new Promise((resolve, reject) => {
          img.onload = () => {
            console.log(`Processed image ${i + 1}/${imagesBase64.length}: ${img.width}x${img.height}`);
            resolve();
          };
          img.onerror = () => {
            console.log(`Failed to process image ${i + 1}`);
            reject(new Error(`Failed to process base64 image ${i + 1}`));
          };
        });
        imagesData.push({
          src: imagesBase64[i],
          width: img.width,
          height: img.height,
        });
        updateProgress(50 + ((i + 1) / imagesBase64.length) * 45); // 45% للمعالجة
      }
      console.log("All base64 images processed successfully");
      return imagesData;
    }
  
    async function createPDF(imagesData, manhwaName, episodeNumber) {
      console.log("Creating PDF...");
      const { jsPDF } = window.jspdf;
      const maxWidth = 800;
      const maxHeightPerPage = 14400;
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "px",
        format: [maxWidth, maxHeightPerPage],
      });
  
      let yOffset = 0;
      let pageCount = 1;
  
      imagesData.forEach((img, index) => {
        if (yOffset + img.height > maxHeightPerPage) {
          doc.addPage();
          pageCount++;
          yOffset = 0;
          console.log(`Added new page ${pageCount}`);
        }
        const xOffset = (maxWidth - img.width) / 2; // توسيط الصورة
        doc.addImage(img.src, "JPEG", xOffset, yOffset, img.width, img.height);
        console.log(`Added image ${index + 1} at xOffset: ${xOffset}, yOffset: ${yOffset} on page ${pageCount}`);
        yOffset += img.height;
      });
  
      console.log(`Saving PDF with ${pageCount} pages...`);
      const fileName = `${manhwaName.replace(/\s+/g, "_")}_Ep${episodeNumber}.pdf`;
      
      // نرجع Promise عشان نتاكد إن الـ PDF اتحمل
      return new Promise((resolve) => {
        const blob = doc.output('blob');
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
  
        // نحدث الـ progress لـ 98% قبل التحميل
        updateProgress(98);
  
        link.addEventListener('click', () => {
          // نحدث الـ progress لـ 100% بعد التحميل
          setTimeout(() => {
            updateProgress(100);
            console.log("PDF saved and downloaded");
            window.URL.revokeObjectURL(url);
            resolve();
          }, 100); // تأخير بسيط عشان الـ UI تتحدث
        });
  
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      });
    }
  
    downloadBtn.addEventListener('click', async () => {
      const manhwaName = manhwaNameInput.value;
      const episodeNumber = episodeNumberInput.value;
      console.log(`Download button clicked for ${manhwaName}, Episode ${episodeNumber}`);
  
      if (!manhwaName || !episodeNumber) {
        console.log("Missing inputs");
        alert('Please fill in all fields');
        return;
      }
  
      progressContainer.style.display = 'block';
      downloadBtn.disabled = true;
      downloadBtn.innerText = "Downloading...";
      updateProgress(0);
  
      const source = new EventSource("https://manhwa-downloader-backend-production.up.railway.app/progress");
      source.onmessage = event => {
        const data = JSON.parse(event.data);
        updateProgress(data.progress); // الـ progress من الـ backend (0-50%)
        console.log(`Progress from backend: ${data.progress}%`);
        if (data.progress >= 50) {
          source.close();
          console.log("Progress stream closed");
        }
      };
      source.onerror = () => {
        source.close();
        console.log("Progress stream error");
      };
  
      try {
        const imagesBase64 = await fetchImages(manhwaName, episodeNumber);
        const imagesData = await loadImages(imagesBase64);
        await createPDF(imagesData, manhwaName, episodeNumber);
        console.log("Download process completed");
      } catch (error) {
        console.log(`Error during download: ${error.message}`);
        alert("Error: " + error.message);
      } finally {
        resetUI();
      }
    });
  });