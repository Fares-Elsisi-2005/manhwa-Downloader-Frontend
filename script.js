document.addEventListener('DOMContentLoaded', () => {
    const downloadBtn = document.getElementById('downloadBtn');
    const manhwaNameInput = document.getElementById('manhwaName');
    const episodeNumberInput = document.getElementById('episodeNumber');
    const progressContainer = document.querySelector('.progress-container');
    const progressFill = document.querySelector('.progress-fill');
    const progressPercentage = document.querySelector('.progress-percentage');

    downloadBtn.addEventListener('click', async () => {
        const manhwaName = manhwaNameInput.value;
        const episodeNumber = episodeNumberInput.value;

        if (!manhwaName || !episodeNumber) {
            alert('Please fill in all fields');
            return;
        }

        // Show progress bar
        progressContainer.style.display = 'block';
        downloadBtn.disabled = true;
        downloadBtn.innerText = "Downloading...";
        progressFill.style.width = '0%';
        progressPercentage.textContent = '0%';

        // إنشاء EventSource لتتبع التقدم
        const source = new EventSource("https://manhwa-downloader-backend.railway.app/progress");

        source.onmessage = function (event) {
            const data = JSON.parse(event.data);
            const progress = data.progress;
            progressFill.style.width = `${progress}%`;
            progressPercentage.textContent = `${progress}%`;

            if (progress >= 100) {
                source.close();
            }
        };

        source.onerror = function () {
            source.close();
            console.error("Error with progress updates");
        };

        try {
            const response = await fetch('https://manhwa-downloader-backend.railway.app/download', {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ mangaName: manhwaName, episodeNum: episodeNumber }),
            });

            if (!response.ok) {
                const result = await response.json();
                throw new Error(result.error);
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = `${manhwaName.replace(/\s+/g, "_")}_Ep${episodeNumber}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);

            alert("Download completed! Check your Downloads folder.");
        } catch (error) {
            alert("Error: " + error.message);
        } finally {
            downloadBtn.disabled = false;
            downloadBtn.innerText = "Download Episode";
            progressContainer.style.display = 'none';
            progressFill.style.width = '0%';
            progressPercentage.textContent = '0%';
        }
    });
});