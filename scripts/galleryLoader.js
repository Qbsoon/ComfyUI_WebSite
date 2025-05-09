function findCheckpoint(workflowData) {
    if (!workflowData || typeof workflowData !== 'object') {
        return false;
    }
    const checkpoints = ['sd3.5_large_fp8_scaled.safetensors', 'sd_xl_base_1.0.safetensors', 'sd_xl_turbo_1.0_fp16.safetensors', 'flux1-dev-Q8_0.gguf', 'PixArt-Sigma-XL-2-2K-MS.pth']
    try {
        const jsonString = JSON.stringify(workflowData);
        for (let i = 0; i < checkpoints.length; i++) {
            const checkpointName = checkpoints[i];
            const searchPattern = `"${checkpointName}"`;
            if (jsonString.includes(searchPattern)) {
                return checkpointName;
            }
        }
    } catch (e) {
        console.error("Error stringifying workflow data:", e);
        return false;
    }
}

function getComfyMetadata(workflowData, checkpointName) {
    try {
        if (checkpointName === 'sd_xl_base_1.0.safetensors') {
            let metadataObject = {
                checkpointName: checkpointName,
                promptP: workflowData["6"].inputs.text,
                promptN: workflowData["7"].inputs.text,
                sampler: workflowData["10"].inputs.sampler_name,
                scheduler: workflowData["10"].inputs.scheduler,
                cfg: workflowData["10"].inputs.cfg,
                steps: workflowData["10"].inputs.end_at_step,
                stepsRefiner: parseInt(workflowData["10"].inputs.steps)-parseInt(workflowData["10"].inputs.end_at_step),
                width: workflowData["5"].inputs.width,
                height: workflowData["5"].inputs.height
            }
            return metadataObject;
        } else if (checkpointName === 'sd3.5_large_fp8_scaled.safetensors') {
            let metadataObject = {
                checkpointName: checkpointName,
                promptP: workflowData["6"].inputs.text,
                promptN: workflowData["7"].inputs.text,
                sampler: workflowData["3"].inputs.sampler_name,
                scheduler: workflowData["3"].inputs.scheduler,
                cfg: workflowData["3"].inputs.cfg,
                steps: workflowData["3"].inputs.steps,
                width: workflowData["5"].inputs.width,
                height: workflowData["5"].inputs.height
            }
            return metadataObject;
        } else if (checkpointName === 'sd_xl_turbo_1.0_fp16.safetensors') {
            let metadataObject = {
                checkpointName: checkpointName,
                promptP: workflowData["6"].inputs.text,
                promptN: workflowData["7"].inputs.text,
                sampler: workflowData["14"].inputs.sampler_name,
                cfg: workflowData["13"].inputs.cfg,
                steps: workflowData["22"].inputs.steps,
                width: workflowData["5"].inputs.width,
                height: workflowData["5"].inputs.height
            }
            return metadataObject;
        } else if (checkpointName === 'flux1-dev-Q8_0.gguf') {
            let metadataObject = {
                checkpointName: checkpointName,
                promptP: workflowData["11"].inputs.text,
                sampler: workflowData["14"].inputs.sampler_name,
                scheduler: workflowData["15"].inputs.scheduler,
                guidance: workflowData["9"].inputs.guidance,
                steps: workflowData["15"].inputs.steps,
                width: workflowData["12"].inputs.width,
                height: workflowData["12"].inputs.height
            }
            return metadataObject;
        } else if (checkpointName === 'PixArt-Sigma-XL-2-2K-MS.pth') {
            let metadataObject = {
                checkpointName: checkpointName,
                promptP: workflowData["5"].inputs.text,
                promptN: workflowData["6"].inputs.text,
                sampler: workflowData["4"].inputs.sampler_name,
                scheduler: workflowData["4"].inputs.scheduler,
                cfg: workflowData["4"].inputs.cfg,
                steps: workflowData["4"].inputs.steps,
                ratio: workflowData["2"].inputs.ratio
            }
            return metadataObject;
        }
    } catch (e) {
        console.error("Error extracting metadata from workflow data:", e);
        return null;
    }
}

async function parsePngForComfyMetadata(arrayBuffer) {
    const view = new DataView(arrayBuffer);
    const textDecoder = new TextDecoder('utf-8');

    // Check PNG signature
    const pngSignature = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
    for (let i = 0; i < pngSignature.length; i++) {
        if (view.getUint8(i) !== pngSignature[i]) {
            console.error("Not a valid PNG file or invalid signature.");
            return { prompt: null, workflow: null };
        }
    }

    let offset = 8; // Skip signature
    let comfyMetadata = null;

    while (offset < arrayBuffer.byteLength) {
        const length = view.getUint32(offset, false); // Length of chunk data
        offset += 4;
        const type = textDecoder.decode(new Uint8Array(arrayBuffer, offset, 4));
        offset += 4;

        if (type === "tEXt") {
            const chunkData = new Uint8Array(arrayBuffer, offset, length);
            // Find the null terminator to separate keyword from text
            let keywordEnd = -1;
            for (let i = 0; i < length; i++) {
                if (chunkData[i] === 0) {
                    keywordEnd = i;
                    break;
                }
            }

            if (keywordEnd !== -1) {
                const keyword = textDecoder.decode(new Uint8Array(arrayBuffer, offset, keywordEnd));
                const text = textDecoder.decode(new Uint8Array(arrayBuffer, offset + keywordEnd + 1, length - keywordEnd - 1));

                if (keyword === "prompt") {
                    try {
                        comfyMetadata = JSON.parse(text);
                    } catch (e) {
                        console.error("Error parsing 'prompt' metadata JSON:", e, "Raw text:", text);
                    }
                }
            }
        }

        offset += length; // Move to CRC
        offset += 4;      // Skip CRC

        if (type === "IEND" || (comfyMetadata)) {
            break; // End of PNG or both found
        }
    }
    if (comfyMetadata) {
        const checkpointName = findCheckpoint(comfyMetadata);
        console.log(comfyMetadata);
        return getComfyMetadata(comfyMetadata, checkpointName);
    }
    else {
        return comfyMetadata;
    }
}

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

                img.addEventListener('click', async () => {
                    const fullSrc = img.dataset.fullSrc;
                    if (fullSrc && typeof window.openLightbox === 'function') {
                        try {
                            console.log(`Fetching metadata for image: ${fullSrc}`);
                            const imageResponse = await fetch(fullSrc);
                            if (!imageResponse.ok) {
                                throw new Error(`Failed to fetch image for metadata parsing: ${imageResponse.status} ${imageResponse.statusText}`);
                            }
                            const arrayBuffer = await imageResponse.arrayBuffer();
                            const comfyData = await parsePngForComfyMetadata(arrayBuffer);

                            if (comfyData) {
                                window.openLightbox(fullSrc, comfyData);
                            } else {
                                window.openLightbox(fullSrc, null);
                                console.log("No 'prompt' metadata found in this PNG.");
                            }
                        } catch (error) {
                            console.error("Error fetching or parsing PNG metadata:", error);
                        }
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
