function findCheckpoint(workflowData) {
    if (!workflowData || typeof workflowData !== 'object') {
        return false;
    }
    const checkpoints = ['sd3.5_large_fp8_scaled.safetensors', 'sd_xl_base_1.0.safetensors', 'sd_xl_turbo_1.0_fp16.safetensors', 'FLUX1/flux1-dev-Q8_0.gguf', 'PixArt-Sigma-XL-2-2K-MS.pth', 'hidream_i1_fast_fp8.safetensors', 'VerusVision_1.0b_Transformer_fp8.safetensors', 'control-lora-recolor-rank256.safetensors', 'RealESRGAN_x4plus.pth', 'flux1-fill-dev-Q8_0.gguf']
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
        } else if (checkpointName === 'FLUX1/flux1-dev-Q8_0.gguf') {
            let promptPcopy = workflowData["11"].inputs.text;
			if (lora === 'Textimprover-FLUX-V0.4.safetensors') {
				if (promptPcopy.endsWith('aidmaTextImprover')) {
                    promptPcopy = promptPcopy.slice(0, -18);
                }
			} else if (lora === 'aidmaDoubleExposure-v0.1.safetensors') {
                if (promptPcopy.endsWith('Double Exposure')) {
                    promptPcopy = promptPcopy.slice(0, -16);
                }
			} else if (lora === 'aidmaFLUXPro1.1-FLUX-v0.3.safetensors') {
                if (promptPcopy.endsWith('aidmafluxpro1.1')) {
                    promptPcopy = promptPcopy.slice(0, -16);
                }
			} else if (lora === 'aidmaMJv7-FLUX-v0.1.safetensors') {
                if (promptPcopy.endsWith('aidmamjv7')) {
                    promptPcopy = promptPcopy.slice(0, -10);
                }
			} else if (lora === 'aidmaPsychadelicChaosWorld-FLUX-v0.1.safetensors') {
                if (promptPcopy.endsWith('PsychadelicChaos')) {
                    promptPcopy = promptPcopy.slice(0, -17);
                }
			} else if (lora === 'aidmaRealisticSkin-FLUX-v0.1.safetensors') {
                if (promptPcopy.endsWith('aidmarealisticskin')) {
                    promptPcopy = promptPcopy.slice(0, -19);
                }
			}
            let metadataObject = {
                checkpointName: checkpointName,
                promptP: promptPcopy,
                sampler: workflowData["14"].inputs.sampler_name,
                scheduler: workflowData["15"].inputs.scheduler,
                guidance: workflowData["9"].inputs.guidance,
                steps: workflowData["15"].inputs.steps,
                width: workflowData["12"].inputs.width,
                height: workflowData["12"].inputs.height,
                lora: workflowData["98"].inputs.lora_name,
                loraStrength: workflowData["98"].inputs.strength_model
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
        } else if (checkpointName === 'hidream_i1_fast_fp8.safetensors') {
            let metadataObject = {
                checkpointName: checkpointName,
                promptP: workflowData["16"].inputs.text,
                promptN: workflowData["40"].inputs.text,
                sampler: workflowData["3"].inputs.sampler_name,
                scheduler: workflowData["3"].inputs.scheduler,
                cfg: workflowData["3"].inputs.cfg,
                steps: workflowData["3"].inputs.steps,
                width: workflowData["53"].inputs.width,
                height: workflowData["53"].inputs.height
            }
            return metadataObject;
        } else if (checkpointName === 'VerusVision_1.0b_Transformer_fp8.safetensors') {
            let metadataObject = {
                checkpointName: checkpointName,
                promptP: workflowData["6"].inputs.text,
                sampler: workflowData["16"].inputs.sampler_name,
                scheduler: workflowData["17"].inputs.scheduler,
                cfg: workflowData["40"].inputs.cfg,
                steps: workflowData["17"].inputs.steps,
                width: workflowData["39"].inputs.width,
                height: workflowData["39"].inputs.height
            }
            return metadataObject;
        } else if (checkpointName === 'control-lora-recolor-rank256.safetensors') {
            let metadataObject = {
                checkpointName: 'colorizing',
                promptP: workflowData["3"].inputs.text,
                promptN: workflowData["4"].inputs.text,
                sampler: workflowData["2"].inputs.sampler_name,
                scheduler: workflowData["2"].inputs.scheduler,
                cfg: workflowData["2"].inputs.cfg,
                steps: workflowData["2"].inputs.steps,
                blend: workflowData["161"].inputs.blend_percentage,
                editof: workflowData["174"].inputs.image
            }
            return metadataObject;
        } else if (checkpointName === 'RealESRGAN_x4plus.pth') {
            let metadataObject = {
                checkpointName: 'upscaling',
                editof: workflowData["1"].inputs.image
            }
            return metadataObject;
        } else if (checkpointName === 'flux1-fill-dev-Q8_0.gguf') {
            let metadataObject = {
                checkpointName: 'outpainting',
                promptP: workflowData["23"].inputs.text,
                sampler: workflowData["3"].inputs.sampler_name,
                scheduler: workflowData["3"].inputs.scheduler,
                guidance: workflowData["26"].inputs.guidance,
                steps: workflowData["3"].inputs.steps,
                feathering: workflowData["44"].inputs.feathering,
                leftMask: workflowData["44"].inputs.left,
                topMask: workflowData["44"].inputs.top,
                rightMask: workflowData["44"].inputs.right,
                bottomMask: workflowData["44"].inputs.bottom,
                editof: workflowData["17"].inputs.image
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
        return getComfyMetadata(comfyMetadata, checkpointName);
    }
    else {
        return comfyMetadata;
    }
}

export async function galleryLoad(target, uid, current_page = null, limit_end = null, customManifestUrl = null, model = null, keywords = null, keywordsRadio = null) {
    const outputDiv = document.getElementById(target);
    if (!outputDiv) {
        console.error(`Error loading gallery for target #${target}: Element not found.`);
        return;
    }
    outputDiv.innerHTML = '';

    const isPagedGallery = (target === 'fullGallery' || target === 'publicGallery');
    let currentPage = 1;
    let imagesPerPage = 0;
    let api_from = current_page;
    let api_to = limit_end;
    const itemMinWidth = 202;
    let itemGap = 10;
    let imagesPerRow = 1;
    if (outputDiv.clientWidth > 0) {
        // Correct formula: N = floor((ContainerWidth + Gap) / (ItemWidth + Gap))
        imagesPerRow = Math.max(1, Math.floor((outputDiv.clientWidth + itemGap) / (itemMinWidth + itemGap)));
    } else {
        // Fallback if clientWidth is 0 (e.g., if rAF in main.js is not used or element not ready)
        console.warn(`outputDiv.clientWidth for '${target}' is 0. Estimating imagesPerRow.`);
        // Estimate based on window width, accounting for sidebar and paddings
        const estimatedFallbackContainerWidth = window.innerWidth - 270 - 40 - (itemGap * 2); // Using itemGap for accuracy
        imagesPerRow = Math.max(1, Math.floor((estimatedFallbackContainerWidth + itemGap) / (itemMinWidth + itemGap)));
        if (imagesPerRow < 1) imagesPerRow = 1;
    }
    api_to = imagesPerRow

    if (isPagedGallery) {
        imagesPerPage = 4 * imagesPerRow;

        if (typeof current_page === 'number' && current_page > 0) { 
            currentPage = current_page;
        }
        api_from = (currentPage - 1) * imagesPerPage;
        api_to = currentPage * imagesPerPage;
    }

    let manifestUrl;
    if (customManifestUrl) {
        manifestUrl = customManifestUrl;
        if ((api_from !== null && api_from > 0) || (api_to !== null && api_to > 0)) {
            manifestUrl += '?';
        }
        if (api_from !== null && api_to > 0) {
            manifestUrl += `from=${api_from}`;
        }
        if (api_from !== null && api_from >= 0 && api_to !== null && api_to > 0) {
            manifestUrl += '&';
        }
        if (api_to !== null && api_to > 0) {
            manifestUrl += `to=${api_to}`;
        }
    } else {
        manifestUrl = `${window.location.origin}/api/iiif-manifest?uid=${uid}`;
        if (api_from !== null && api_from > 0) {
            manifestUrl += `&from=${api_from}`;
        }
        if (api_to !== null && api_to > 0) {
            manifestUrl += `&to=${api_to}`;
        }
    }

    if (model) {
        manifestUrl += `&model=${model}`;
    }

    if (keywords) {
        manifestUrl += `&keywords=${encodeURIComponent(keywords)}`;
        manifestUrl += `&keywordsRadio=${keywordsRadio}`;
    }

    const isPublicGallery = customManifestUrl === '/api/public-iiif-manifest';
    if (isPagedGallery) {
        const filterControlsDiv = document.createElement('div');
        filterControlsDiv.className = 'filter-controls';
        filterControlsDiv.style.gridColumn = '1 / -1'
        const filterModelSelect = document.createElement('select');
        filterModelSelect.appendChild(new Option('All Models', 'all'));
        const models = ['sd_xl_base_1.0.safetensors', 'sd_xl_turbo_1.0_fp16.safetensors', 'sd3.5_large_fp8_scaled.safetensors', 'flux1-dev-Q8_0.gguf', 'hidream_i1_fast_fp8.safetensors', 'VerusVision_1.0b_Transformer_fp8.safetensors', 'colorizing', 'upscaling', 'outpainting'];
        const modelNames = ['SDXL', 'SDXL Turbo', 'SD 3.5', 'FLUX1', 'HiDream I1 Fast', 'Verus Vision 1.0b Transformer (fp8)', 'Colorizing', 'Upscaling', 'Outpainting'];
        models.forEach((model, index) => {
            const option = new Option(modelNames[index], model);
            filterModelSelect.appendChild(option);
        });
        filterModelSelect.value = model || 'all';
        filterModelSelect.addEventListener('change', () => {
            const selectedModel = filterModelSelect.value;
            if (selectedModel === 'all') {
                galleryLoad(target, uid, 1, limit_end, customManifestUrl, null, keywords, keywordsRadio);
            } else {
                galleryLoad(target, uid, 1, limit_end, customManifestUrl, selectedModel, keywords, keywordsRadio);
            }
        });

        const filterKeywords = document.createElement('input');
        filterKeywords.type = 'text';
        filterKeywords.id = 'filterKeywords';
        filterKeywords.placeholder = 'Filter keywords';
        filterKeywords.title = 'Keywords should be separated by commas';
        const radioAll = document.createElement('input');
        radioAll.type = 'radio';
        radioAll.name = 'keywordsRadio';
        radioAll.value = 'all';
        radioAll.checked = true;
        const radioAny = document.createElement('input');
        radioAny.type = 'radio';
        radioAny.name = 'keywordsRadio';
        radioAny.value = 'any';
        if (keywordsRadio === 'any') {
            radioAny.checked = true;
        }
        const filterKeywordsBtn = document.createElement('button');
        filterKeywordsBtn.textContent = 'Filter'
        filterKeywordsBtn.addEventListener('click', () => {
            const keywordsText = filterKeywords.value;
            const radioButtons = document.querySelectorAll('input[name="keywordsRadio"]');
            let selectedRadio = null;
            radioButtons.forEach((radio) => {
                if (radio.checked) {
                    selectedRadio = radio.value;
                }
            });
            if (keywordsText !='') {
                galleryLoad(target, uid, 1, limit_end, customManifestUrl, model, keywordsText, selectedRadio);
            } else {
                galleryLoad(target, uid, 1, limit_end, customManifestUrl, model, keywordsText);
            }
        });
        const filterRefreshBtn = document.createElement('button');
        filterRefreshBtn.innerHTML = '<span>&#x21BB;</span>';
        filterRefreshBtn.class = 'refresh-button';
        filterRefreshBtn.addEventListener('click', () => {
            galleryLoad(target, uid, 1, limit_end, customManifestUrl, model, keywords, keywordsRadio);
        });
        

        if (keywords) {
            filterKeywords.value = keywords;
        }

        filterControlsDiv.appendChild(filterModelSelect);
        filterControlsDiv.appendChild(filterKeywords);
        filterControlsDiv.appendChild(radioAll);
        filterControlsDiv.appendChild(document.createTextNode('All'));
        filterControlsDiv.appendChild(radioAny);
        filterControlsDiv.appendChild(document.createTextNode('Any'));
        filterControlsDiv.appendChild(filterKeywordsBtn);
        filterControlsDiv.appendChild(filterRefreshBtn);
        outputDiv.appendChild(filterControlsDiv);
    }
    
    const loadingMessage = document.createElement('p');
    loadingMessage.id = 'loadingP';
    loadingMessage.style.textAlign = 'center';
    loadingMessage.style.marginTop = '20px';
    loadingMessage.textContent = 'Loading gallery...';
    loadingMessage.style.gridColumn = '1 / -1'; 
    outputDiv.appendChild(loadingMessage);

    try {
        const response = await fetch(manifestUrl);
        if (!response.ok) {
            let errorBody = await response.text();
            console.error(`Manifest fetch failed for #${target}. Status: ${response.status}. Body: ${errorBody}`);
            if (errorBody.includes("No images found") || response.status === 404) {
                console.info(`Gallery for target #${target} is empty.`);
                const emptyMessage = document.createElement('p');
                emptyMessage.textContent = 'Gallery empty';
                emptyMessage.style.textAlign = 'center';
                emptyMessage.style.marginTop = '20px';
                emptyMessage.style.gridColumn = '1 / -1'; 
                if (outputDiv.contains(loadingMessage)) {
                    outputDiv.removeChild(loadingMessage);
                }
                outputDiv.appendChild(emptyMessage);
                return;
            } else if (response.status === 403) {
                 console.warn(`Unauthorized access to manifest for #${target}.`);
                 outputDiv.innerHTML = '<p>You are not authorized to view this gallery.</p>';
                 return;
            } else {
                throw new Error(`Failed to fetch manifest: ${response.status} ${response.statusText}`);
            }
        }
        const manifest = await response.json();

        if (!manifest.sequences || manifest.sequences.length === 0 || !manifest.sequences[0].canvases || manifest.sequences[0].canvases.length === 0) {
            if (model || keywords) {
                console.info(`Gallery for target #${target} is empty after filtering.`);
                const emptyMessage = document.createElement('p');
                emptyMessage.textContent = 'No images found for selected filters';
                emptyMessage.style.textAlign = 'center';
                emptyMessage.style.marginTop = '20px';
                emptyMessage.style.gridColumn = '1 / -1'; 
                if (outputDiv.contains(loadingMessage)) {
                    outputDiv.removeChild(loadingMessage);
                }
                outputDiv.appendChild(emptyMessage);
                return;
            } else {
                console.info(`Gallery for target #${target} is empty.`);
                const emptyMessage = document.createElement('p');
                emptyMessage.textContent = 'Gallery empty';
                emptyMessage.style.textAlign = 'center';
                emptyMessage.style.marginTop = '20px';
                emptyMessage.style.gridColumn = '1 / -1'; 
                if (outputDiv.contains(loadingMessage)) {
                    outputDiv.removeChild(loadingMessage);
                }
                outputDiv.appendChild(emptyMessage);
                return;
            }
        }

        
        if (outputDiv.contains(loadingMessage)) {
            outputDiv.removeChild(loadingMessage);
        }

        if (isPagedGallery) {
                if (isPagedGallery && manifest.totalCanvases > 0 && imagesPerPage > 0) {
                    const totalPages = Math.ceil(manifest.totalCanvases / imagesPerPage);
                    if (totalPages > 0) { 
                    
                        const pagingControlsDiv = document.createElement('div');
                        pagingControlsDiv.className = 'paged-controls';
                        pagingControlsDiv.style.gridColumn = '1 / -1'; 
                    
                        const firstBtn = document.createElement('button');
                        firstBtn.textContent = 'First';
                        firstBtn.disabled = currentPage === 1;
                        firstBtn.addEventListener('click', () => galleryLoad(target, uid, 1, null, customManifestUrl, model, keywords, keywordsRadio));
                    
                        const prevBtn = document.createElement('button');
                        prevBtn.textContent = 'Previous';
                        prevBtn.disabled = currentPage === 1;
                        prevBtn.addEventListener('click', () => galleryLoad(target, uid, currentPage - 1, null, customManifestUrl, model, keywords, keywordsRadio));
                    
                        const pageInfo = document.createElement('span');
                        pageInfo.textContent = `${currentPage}/${totalPages}`;
                        pageInfo.style.margin = '0 10px'; 
                    
                        const nextBtn = document.createElement('button');
                        nextBtn.textContent = 'Next';
                        nextBtn.disabled = currentPage === totalPages;
                        nextBtn.addEventListener('click', () => galleryLoad(target, uid, currentPage + 1, null, customManifestUrl, model, keywords, keywordsRadio));
                    
                        const lastBtn = document.createElement('button');
                        lastBtn.textContent = 'Last';
                        lastBtn.disabled = currentPage === totalPages;
                        lastBtn.addEventListener('click', () => galleryLoad(target, uid, totalPages, null, customManifestUrl, model, keywords, keywordsRadio));

                        [firstBtn, prevBtn, nextBtn, lastBtn].forEach(btn => {
                            btn.style.margin = "0 5px"; 
                            btn.style.padding = "5px 10px";
                        });
                    
                        pagingControlsDiv.appendChild(firstBtn);
                        pagingControlsDiv.appendChild(prevBtn);
                        pagingControlsDiv.appendChild(pageInfo);
                        pagingControlsDiv.appendChild(nextBtn);
                        pagingControlsDiv.appendChild(lastBtn);
                        outputDiv.appendChild(pagingControlsDiv); 
                    }
                }
            }
        const canvases = manifest.sequences[0].canvases;

        canvases.forEach(canvas => {
            let thumbnailUrl = null;
            let fullImageUrl = null;
            let imageOwnerUid = uid;
            let isPublic = false;
            let originalFilename = canvas.label || 'gallery_image.png';

            if (canvas.thumbnail && canvas.thumbnail['@id']) {
                thumbnailUrl = canvas.thumbnail['@id'];
            } else if (canvas.thumbnail && typeof canvas.thumbnail === 'string') {
                thumbnailUrl = canvas.thumbnail;
            }

            if (canvas.images && canvas.images.length > 0 && canvas.images[0].resource) {
                fullImageUrl = canvas.images[0].resource['@id'] || canvas.images[0].resource.id;
                if (isPublicGallery) {
                    if (canvas.service && canvas.service.length > 0 && canvas.service[0].original_uploader) {
                        imageOwnerUid = canvas.service[0].original_uploader;
                    }
                    isPublic = true;
                } else {
                    if (canvas.service && canvas.service.length > 0 && typeof canvas.service[0].is_public === 'boolean') {
                        isPublic = canvas.service[0].is_public;
                    }
                }
            }

            originalFilename = fullImageUrl.substring(fullImageUrl.lastIndexOf('/') + 1);

            if (!thumbnailUrl && fullImageUrl) thumbnailUrl = fullImageUrl;

            if (thumbnailUrl && fullImageUrl) {
                const img = document.createElement('img');
                img.src = thumbnailUrl;
                img.alt = canvas.label || 'Gallery image';

                img.dataset.fullSrc = fullImageUrl;

                img.dataset.ownerUid = imageOwnerUid;
                img.dataset.isPublic = isPublic.toString();
                img.dataset.filename = originalFilename;

                img.style.width = '200px';
                img.style.height = 'auto';
                img.style.margin = '5px';
                img.style.cursor = 'pointer';

                img.addEventListener('click', async () => {
                    const fullSrc = img.dataset.fullSrc;
                    const owner = img.dataset.ownerUid;
                    const publicStatus = img.dataset.isPublic === 'true';
                    const filenameFromDataset = img.dataset.filename;
                    if (fullSrc && typeof window.openLightbox === 'function') {
                        try {
                            console.log(`Fetching metadata for image: ${fullSrc}`);
                            const imageResponse = await fetch(fullSrc);
                            if (!imageResponse.ok) throw new Error(`Failed to fetch image for metadata parsing: ${imageResponse.status} ${imageResponse.statusText}`);
                            const arrayBuffer = await imageResponse.arrayBuffer();
                            const comfyData = await parsePngForComfyMetadata(arrayBuffer);

                            if (comfyData) {
                                window.openLightbox(fullSrc, comfyData, owner, publicStatus, filenameFromDataset);
                            } else {
                                window.openLightbox(fullSrc, null, owner, publicStatus, filenameFromDataset);
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
        if (outputDiv) outputDiv.innerHTML = 'Error loading gallery.';
    }
}
