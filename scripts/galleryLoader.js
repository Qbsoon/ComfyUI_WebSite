export async function galleryLoad(target, uid, limit = null) {
    const outputDiv = document.getElementById(target);
    if (!outputDiv) {
        console.error(`Error loading gallery for target #${target}: Element not found.`);
        return;
    }

    // URL do endpointu generującego manifest
    let manifestUrl = `${window.location.origin}/api/iiif-manifest?uid=${uid}`;
    if (limit !== null && limit > 0) {
        manifestUrl += `&limit=${limit}`;
    }

    console.log(`Fetching IIIF manifest for target #${target} from: ${manifestUrl}`);

    try {
        const response = await fetch(manifestUrl);
        if (!response.ok) {
            throw new Error(`Failed to fetch IIIF manifest: ${response.statusText}`);
        }
        const manifest = await response.json();

        outputDiv.innerHTML = '';

        if (!manifest.sequences || manifest.sequences.length === 0 || !manifest.sequences[0].canvases) {
            console.warn(`Manifest for ${target} is empty or has unexpected structure.`);
            outputDiv.innerHTML = 'No images found.';
            return;
        }

        const canvases = manifest.sequences[0].canvases;

        canvases.forEach(canvas => {
            let imageUrl = null;
            if (canvas.images && canvas.images.length > 0 && canvas.images[0].resource) {
                imageUrl = canvas.images[0].resource['@id'] || canvas.images[0].resource.id;
            }

            if (imageUrl) {
                const img = document.createElement('img');
                img.src = imageUrl;
                img.alt = canvas.label || 'Gallery image';
                img.style.width = '200px';
                img.style.height = 'auto';
                img.style.margin = '5px';
                img.style.cursor = 'pointer';

                img.addEventListener('click', () => {
                    if (typeof window.openLightbox === 'function') {
                        window.openLightbox(imageUrl);
                    } else {
                        console.error('openLightbox function not found.');
                        window.open(imageUrl, '_blank');
                    }
                });

                outputDiv.appendChild(img);
            } else {
                console.warn('Canvas found without a valid image URL:', canvas);
            }
        });

    } catch (error) {
        console.error(`Error processing manifest for target #${target}:`, error);
        if (outputDiv) {
            outputDiv.innerHTML = 'Error loading images.';
        }
    }
}