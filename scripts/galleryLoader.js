export async function galleryLoad(directory, target, limit) {
    try {
        const response = await fetch(directory);
        if (!response.ok) {
            throw new Error(`Failed to load directory: ${response.statusText}`);
        }
	
        const html = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
	
        // Znajdź wszystkie linki do plików w katalogu
        const images_raw = Array.from(doc.querySelectorAll('tr'));
        const images = images_raw
            .map(image => {
                const link = image.querySelector('a');
                const imageDate = image.querySelector('td:nth-child(3)');
                if (link && imageDate) {
                    return {
                        name: link.getAttribute('href'),
                        date: new Date(imageDate.textContent.trim())
                    };
                }
                return null;
            })
            .filter(image => image && /\.(jpg|jpeg|png)$/i.test(image.name)); // Filtruj tylko obrazy
		
        // Sort files by modification date (newest first)
        images.sort((a, b) => b.date - a.date);
		
        const outputDiv = document.getElementById(target);
        outputDiv.innerHTML = ''; // Wyczyść poprzednie obrazy

        const finalImages = limit > 0 ? images.slice(0, limit) : images;
		
        finalImages.forEach(image => {
            const img = document.createElement('img');
            img.src = `${directory}/${image.name}`;
            img.alt = image;
            img.style.margin = '10px';
            img.style.maxWidth = '200px';
            img.style.height = 'auto';

			// Add click event to open the modal
			img.addEventListener('click', () => {
				const modal = document.getElementById('imageModal');
				const modalImage = document.getElementById('modalImage');
				modalImage.src = img.src; // Set the modal image source to the clicked image
				modal.style.display = 'flex'; // Show the modal
			});

			// Close modal when clicking outside the image
			document.getElementById('imageModal').addEventListener('click', (event) => {
			    const modal = document.getElementById('imageModal');
			    const modalImage = document.getElementById('modalImage');
			
			    // Close the modal only if the click is outside the image
			    if (event.target !== modalImage) {
			        modal.style.display = 'none';
			    }
			});

            outputDiv.appendChild(img);
        });
    } catch (error) {
        console.error('Error loading images:', error);
        alert('Nie udało się załadować obrazów.');
    }
}