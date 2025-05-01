export async function galleryLoad(target, uid, limit = null) {
    const outputDiv = document.getElementById(target);
    if (!outputDiv) {
        console.error(`Error loading gallery for target #${target}: Element not found.`);
        return;
    }

    let manifestUrl = `${window.location.origin}/api/iiif-manifest?uid=${uid}`;
    if (limit !== null && limit > 0) {
        manifestUrl += `&limit=${limit}`;
    }

    console.log(`Fetching data for target #${target} from: ${manifestUrl}`);
    outputDiv.innerHTML = '<p>Loading gallery...</p>';

    try {
        const response = await fetch(manifestUrl);
        if (!response.ok) {
            let errorBody = await response.text();
            console.error(`Manifest fetch failed for #${target}. Status: ${response.status}. Body: ${errorBody}`);
            if (errorBody.includes("No images found")) {
                console.info(`Gallery for target #${target} is empty.`);
                const emptyMessage = document.createElement('p');
                emptyMessage.textContent = 'Gallery empty';
                emptyMessage.style.textAlign = 'center';
                emptyMessage.style.marginTop = '20px';
                outputDiv.innerHTML = "";
                outputDiv.appendChild(emptyMessage);
                return;
            } else {
                throw new Error(`Failed to fetch manifest: ${response.status} ${response.statusText}`);
            }
        }
        const manifest = await response.json();

        outputDiv.innerHTML = '';

        if (!manifest.sequences || manifest.sequences.length === 0 || !manifest.sequences[0].canvases || manifest.sequences[0].canvases.length === 0) {
            console.info(`Gallery for target #${target} is empty.`);
            const emptyMessage = document.createElement('p');
            emptyMessage.textContent = 'Gallery empty';
            emptyMessage.style.textAlign = 'center';
            emptyMessage.style.marginTop = '20px';
            outputDiv.appendChild(emptyMessage);
            return;
        }

        const canvases = manifest.sequences[0].canvases;

        canvases.forEach(canvas => {
            let thumbnailUrl = null;
            let fullImageUrl = null;

            if (canvas.thumbnail && canvas.thumbnail['@id']) {
                thumbnailUrl = canvas.thumbnail['@id'];
            } else if (canvas.thumbnail && typeof canvas.thumbnail === 'string') {
                thumbnailUrl = canvas.thumbnail;
            }

            if (canvas.images && canvas.images.length > 0 && canvas.images[0].resource) {
                fullImageUrl = canvas.images[0].resource['@id'] || canvas.images[0].resource.id;
            }

            if (!thumbnailUrl) {
                thumbnailUrl = fullImageUrl;
            }

            if (thumbnailUrl && fullImageUrl) {
                const img = document.createElement('img');
                img.src = thumbnailUrl;
                img.alt = canvas.label || 'Gallery image';

                img.dataset.fullSrc = fullImageUrl;

                img.style.width = '200px';
                img.style.height = 'auto';
                img.style.margin = '5px';
                img.style.cursor = 'pointer';

                img.addEventListener('click', () => {
                    const fullSrc = img.dataset.fullSrc;
                    if (fullSrc && typeof window.openLightbox === 'function') {
                        window.openLightbox(fullSrc);
                    } else {
                        console.error('openLightbox function not found or full image URL missing.');
                        if (fullSrc) window.open(fullSrc, '_blank');
                    }
                });

                outputDiv.appendChild(img);
            } else {
                console.warn('Canvas found without a valid thumbnail or full image URL:', canvas);
            }
        });

    } catch (error) {
        console.error(`Error processing data for target #${target}:`, error);
        if (outputDiv) {
            outputDiv.innerHTML = 'Error loading gallery.';
        }
    }
}