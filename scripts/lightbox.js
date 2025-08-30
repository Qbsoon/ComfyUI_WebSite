import { uid, i18next } from './main.js';
import { updateGridVariables, updateResRatio } from './main.js';
import { switchTab, changeModel } from './formUpdate.js';

// Odnośniki
const publicGalleryTab = document.getElementById('publicGalleryTab');
const outputDiv = document.getElementById('output');
const imageInput = document.getElementById('imageInput');

const modelSelect = document.getElementById('modelSelect');
const editorSelect = document.getElementById('editorSelect');
const positivePrompt = document.getElementById('positivePrompt');
const negativePrompt = document.getElementById('negativePrompt');
const systemPrompt = document.getElementById('systemPrompt');
const stepsRefineInput = document.getElementById('stepsRefineInput');
const schedulerSelect = document.getElementById('schedulerSelect');
const samplerSelect = document.getElementById('samplerSelect');
const cfgInput = document.getElementById('cfgInput');
const guidanceInput = document.getElementById('guidanceInput');
const ratioInput = document.getElementById('ratioInput');
const widthInput = document.getElementById('widthInput');
const heightInput = document.getElementById('heightInput');
const stepsInput = document.getElementById('stepsInput');
const blendInput = document.getElementById('blendInput');
const loraSelect = document.getElementById('loraSelect');
const loraStrengthInput = document.getElementById('loraStrengthInput');
const featheringInput = document.getElementById('featheringInput');
const leftMask = document.getElementById('leftMask');
const topMask = document.getElementById('topMask');
const rightMask = document.getElementById('rightMask');
const bottomMask = document.getElementById('bottomMask');
const upscaleMultiplier = document.getElementById('upscaleMultiplier');
const shiftInput = document.getElementById('shiftInput');

const editors = ['colorizing', 'upscaling', 'outpainting'];

export function openLightbox(imageUrl, workflowData, imageOwnerUid = uid, isPublic = false, filename = null) {
    if (filename == null) {
        filename = imageUrl.substring(imageUrl.lastIndexOf('/') + 1)
    }

    const lightbox = document.createElement('div');
    lightbox.id = 'simpleLightbox';
    lightbox.className = "lightbox-overlay";
    lightbox.style.display = 'flex';

    lightbox.addEventListener('click', (event) => {
        if (event.target === lightbox) {
            closeLightbox();
        }
    });

    const prompts = document.createElement('div');
    prompts.id = 'lightboxPrompts';
    prompts.className = 'lightbox-nav left';

    const lightboxMain = document.createElement('div');
    lightboxMain.id = 'lightboxMainContent';

    const lightboxButtonsUp = document.createElement('div');
    lightboxButtonsUp.id = 'lightboxButtonContainerUpper';
    lightboxButtonsUp.className = 'lightboxButtonContainer';

    const lightboxTogglePublicBtn = document.createElement('button');
    lightboxTogglePublicBtn.id = 'lightboxTogglePublicButton';
    lightboxTogglePublicBtn.className = 'lightbox-action-button public';
    const closeBtn = document.createElement('button');
    closeBtn.id = 'lightboxCloseButton';
    closeBtn.className = 'lightbox-action-button';
    closeBtn.textContent = i18next.t('lightboxClose');
    const deleteBtn = document.createElement('button');
    deleteBtn.id = 'lightboxDeleteButton';
    deleteBtn.className = 'lightbox-action-button delete';
    deleteBtn.textContent = i18next.t('lightboxDelete');
    deleteBtn.style.display = (imageOwnerUid === uid) ? 'inline-block' : 'none';

    lightboxTogglePublicBtn.addEventListener('click', async () => {
        if (!filename || !imageOwnerUid) {
            alert(i18next.t('imageDetailsNotFoundAlert'));
            return;
        }
        // Ensure current logged-in user is the owner before sending request
        if (imageOwnerUid !== uid) {
            alert(i18next.t('togglePublicForeignAlert'));
            return;
        }

        try {
            const response = await fetch('/api/toggle-public-status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ filename: filename, image_owner_uid: imageOwnerUid })
            });
            const result = await response.json();
            if (result.success) {
                if (result.is_public) {
                    lightboxTogglePublicBtn.textContent = i18next.t('lightboxTogglePublicOff');
                    lightboxTogglePublicBtn.classList.add('is-public');
                } else {
                    lightboxTogglePublicBtn.textContent = i18next.t('lightboxTogglePublicOn');
                    lightboxTogglePublicBtn.classList.remove('is-public');
                }
                // Refresh public gallery if it's the active tab
                if (publicGalleryTab.classList.contains('active')) {
                    updateGridVariables();
                }
            } else {
                alert(`${i18next.t('error')}: ${result.error || i18next.t('failedTogglePublicAlert')}`);
            }
        } catch (error) {
            console.error("Error toggling public status:", error);
            alert(i18next.t('errorTryAgain'));
        }
    });
    closeBtn.addEventListener('click', closeLightbox);
    deleteBtn.addEventListener('click', () => {
        if (imageUrl) {
            showDeleteConfirm(imageUrl);
        } else {
            alert(i18next.t('failedDetermineDeleteAlert'));
        }
    });

    lightboxButtonsUp.appendChild(lightboxTogglePublicBtn);
    lightboxButtonsUp.appendChild(closeBtn);
    lightboxButtonsUp.appendChild(deleteBtn);

    const lightboxImage = document.createElement('img');
    lightboxImage.id = 'lightboxImage';
    lightboxImage.className = 'lightbox-content';
    lightboxImage.src = imageUrl;

    const comparison = document.createElement('div');
    comparison.id = 'lightboxComparison';
    comparison.className = 'image-comparison-container';

    const lightboxButtonsDn = document.createElement('div');
    lightboxButtonsDn.id = 'lightboxButtonContainerLower';
    lightboxButtonsDn.className = 'lightboxButtonContainer';

    const lightboxCopyParametersBtn = document.createElement('button');
    lightboxCopyParametersBtn.id = 'lightboxCopyParametersButton';
    lightboxCopyParametersBtn.className = 'lightbox-action-button';
    lightboxCopyParametersBtn.textContent = i18next.t('lightboxCopyParameters');
    const lightboxEditImageBtn = document.createElement('button');
    lightboxEditImageBtn.id = 'lightboxEditImageButton';
    lightboxEditImageBtn.className = 'lightbox-action-button';
    lightboxEditImageBtn.textContent = i18next.t('lightboxEditImage');

    lightboxCopyParametersBtn.addEventListener('click', () => {
        closeLightbox();
        switchTab('generator');
        if (!editors.includes(workflowData.checkpointName)) {
            modelSelect.value = workflowData.checkpointName;
        }
        lightboxCopySet(workflowData);
        changeModel();
        updateResRatio();
    });

    lightboxEditImageBtn.addEventListener('click', () => {
        closeLightbox();
        switchTab('editor');
        imageInput.value = filename;
        const img = document.createElement('img');
        img.src = `gallery/${uid}/${filename}`;
    
        img.onerror = () => {
            alert(i18next.t('failedLoadGeneratedAlert'));
        };
        img.alt = i18next.t('imageToEditAlt');
        outputDiv.innerHTML = '';
        outputDiv.appendChild(img);
    });

    lightboxButtonsDn.appendChild(lightboxCopyParametersBtn);
    lightboxButtonsDn.appendChild(lightboxEditImageBtn);

    lightboxMain.appendChild(lightboxButtonsUp);
    lightboxMain.appendChild(lightboxImage);
    lightboxMain.appendChild(comparison);
    lightboxMain.appendChild(lightboxButtonsDn);

    const parameters = document.createElement('div');
    parameters.id = 'lightboxParameters';
    parameters.className = 'lightbox-nav right';

    lightbox.appendChild(prompts);
    lightbox.appendChild(lightboxMain);
    lightbox.appendChild(parameters);

    document.body.appendChild(lightbox);

    if (lightboxEditImageBtn) {
        lightboxEditImageBtn.style.display = (imageOwnerUid === uid) ? 'inline-block' : 'none';
    }

    if (lightboxTogglePublicBtn) {
        if (isPublic) {
            lightboxTogglePublicBtn.textContent = i18next.t('lightboxTogglePublicOff');
            lightboxTogglePublicBtn.classList.add('is-public');
        } else {
            lightboxTogglePublicBtn.textContent = i18next.t('lightboxTogglePublicOn');
            lightboxTogglePublicBtn.classList.remove('is-public');
        }
        // Only show toggle public button if the current user owns the image
        lightboxTogglePublicBtn.style.display = (imageOwnerUid === uid) ? 'inline-block' : 'none';
    }

    if (workflowData) {
        try {
            comparison.innerHTML = '';
            if (editors.includes(workflowData.checkpointName)) {
                const imageBeforeUrl = workflowData.editof;
                lightboxImage.hidden = true;
                comparison.style.display = 'block';
                const img = document.createElement('img');
                img.src = imageUrl;
                img.onerror = () => {
                    alert(i18next.t('failedLoadGeneratedAlert'));
                };
                img.className = "comparison-image image-top";
                img.alt = i18next.t('imgAfterAlt');
            
                const imgBefore = document.createElement('img');
                imgBefore.src = `gallery/${imageBeforeUrl}`;
                imgBefore.className = "comparison-image image-bottom";
                imgBefore.alt = i18next.t('imgBeforeAlt');
                imgBefore.onerror = () => {
                    alert(i18next.t('failedLoadGeneratedAlert'));
                };
            
                const draggableLine = document.createElement('div');
                draggableLine.className = 'comparison-draggable-line';
            
                let initialPercentage = 50;
            
                if (workflowData.checkpointName === 'outpainting') {
                    img.style.opacity = initialPercentage / 100;
                    draggableLine.style.left = `${initialPercentage}%`;

                    let isDragging = false;

                    draggableLine.addEventListener('mousedown', (e) => {
                        isDragging = true;
                        draggableLine.classList.add('dragging');

                        e.preventDefault();

                        const currentContainerRect = comparison.getBoundingClientRect();

                        function onMouseMove(moveEvent) {
                            if (!isDragging) return;

                            let newX = moveEvent.clientX - currentContainerRect.left;

                            if (newX < 0) newX = 0;
                            if (newX > currentContainerRect.width) newX = currentContainerRect.width;

                            let percentage = (newX / currentContainerRect.width) * 100;

                            percentage = Math.max(0, Math.min(100, percentage));

                            draggableLine.style.left = `${percentage}%`;

                            img.style.opacity = percentage / 100;
                        }

                        function onMouseUp() {
                            if (isDragging) {
                                isDragging = false;
                                draggableLine.classList.remove('dragging');
                                document.removeEventListener('mousemove', onMouseMove);
                                document.removeEventListener('mouseup', onMouseUp);
                            }
                        }

                        document.addEventListener('mousemove', onMouseMove);
                        document.addEventListener('mouseup', onMouseUp);
                    });

                    img.onload = () => {
                        const topMask = parseInt(workflowData.topMask || 0, 10);
                        const bottomMask = parseInt(workflowData.bottomMask || 0, 10);
                        const leftMask = parseInt(workflowData.leftMask || 0, 10);
                        const rightMask = parseInt(workflowData.rightMask || 0, 10);

                        const renderedWidth = img.offsetWidth;
                        const renderedHeight = img.offsetHeight;
                                        
                        const scaleX = renderedWidth / img.naturalWidth;
                        const scaleY = renderedHeight / img.naturalHeight;
                                        
                        const imgBeforeWidth = renderedWidth - (leftMask + rightMask) * scaleX;
                        const imgBeforeHeight = renderedHeight - (topMask + bottomMask) * scaleY;
                                        
                        const imgBeforeLeft = leftMask * scaleX;
                        const imgBeforeTop = topMask * scaleY;
                                                            
                        imgBefore.style.position = "absolute";
                        imgBefore.style.width = `${imgBeforeWidth}px`;
                        imgBefore.style.height = `${imgBeforeHeight}px`;
                        imgBefore.style.left = `${imgBeforeLeft}px`;
                        imgBefore.style.top = `${imgBeforeTop}px`;
                                        
                        comparison.style.position = "relative";
                        comparison.style.width = `${renderedWidth}px`;
                        comparison.style.height = `${renderedHeight}px`;
                                        
                        imgBefore.style.display = "block";
                        img.style.display = "block";
                                        
                        console.log("imgBefore styles:", {
                            top: imgBefore.style.top,
                            left: imgBefore.style.left,
                            width: imgBefore.style.width,
                            height: imgBefore.style.height,
                        });
                        console.log("comparison styles:", {
                            height: comparison.style.height,
                            width: comparison.style.width,
                        });
                    };
                } else {
                    img.style.clipPath = `polygon(${initialPercentage}% 0, 100% 0, 100% 100%, ${initialPercentage}% 100%)`;
                    draggableLine.style.left = `${initialPercentage}%`;

                    let isDragging = false;

                    draggableLine.addEventListener('mousedown', (e) => {
                        isDragging = true;
                        draggableLine.classList.add('dragging');

                        e.preventDefault();

                        const currentContainerRect = comparison.getBoundingClientRect();

                        function onMouseMove(moveEvent) {
                            if (!isDragging) return;

                            let newX = moveEvent.clientX - currentContainerRect.left;

                            if (newX < 0) newX = 0;
                            if (newX > currentContainerRect.width) newX = currentContainerRect.width;

                            let percentage = (newX / currentContainerRect.width) * 100;

                            percentage = Math.max(0, Math.min(100, percentage));

                            draggableLine.style.left = `${percentage}%`;

                            img.style.clipPath = `polygon(${percentage}% 0, 100% 0, 100% 100%, ${percentage}% 100%)`;
                        }

                        function onMouseUp() {
                            if (isDragging) {
                                isDragging = false;
                                draggableLine.classList.remove('dragging');
                                document.removeEventListener('mousemove', onMouseMove);
                                document.removeEventListener('mouseup', onMouseUp);
                            }
                        }

                        document.addEventListener('mousemove', onMouseMove);
                        document.addEventListener('mouseup', onMouseUp);
                    });
                }
                
                comparison.appendChild(imgBefore);
                comparison.appendChild(img);
                comparison.appendChild(draggableLine);
            }

            parameters.innerHTML = '';
            prompts.hidden = false;
            if (imageOwnerUid && imageOwnerUid !== uid) {
                parameters.innerHTML += `<strong>${i18next.t('lightboxSharedBy')}:</strong> ${imageOwnerUid}<br>`;
            }
            if (workflowData.checkpointName === 'sd_xl_base_1.0.safetensors') {
                parameters.innerHTML += `<strong>${i18next.t('modelSelect')}:</strong> Stable Diffusion XL`;
                prompts.innerHTML = `<strong>${i18next.t('positivePrompt')}:</strong> ${workflowData.promptP}`;
                prompts.innerHTML += `<br><strong>${i18next.t('negativePrompt')}:</strong> ${workflowData.promptN}`;
                parameters.innerHTML += `<br><strong>${i18next.t('helpS63')}:</strong> ${workflowData.sampler}`;
                parameters.innerHTML += `<br><strong>${i18next.t('helpS64')}:</strong> ${workflowData.scheduler}`;
                parameters.innerHTML += `<br><strong>${i18next.t('helpS65')}:</strong> ${workflowData.cfg}`;
                parameters.innerHTML += `<br><strong>${i18next.t('helpS67')}:</strong> ${workflowData.steps}`;
                parameters.innerHTML += `<br><strong>${i18next.t('helpS68')}:</strong> ${workflowData.stepsRefiner}`;
                parameters.innerHTML += `<br><strong>${i18next.t('widthInput')}:</strong> ${workflowData.width}`;
                parameters.innerHTML += `<br><strong>${i18next.t('heightInput')}:</strong> ${workflowData.height}`;
            } else if (workflowData.checkpointName === 'sd3.5_large_fp8_scaled.safetensors') {
                parameters.innerHTML += `<strong>${i18next.t('modelSelect')}:</strong> Stable Diffusion 3.5 Large`;
                prompts.innerHTML = `<strong>${i18next.t('positivePrompt')}:</strong> ${workflowData.promptP}`;
                prompts.innerHTML += `<br><strong>${i18next.t('negativePrompt')}:</strong> ${workflowData.promptN}`;
                parameters.innerHTML += `<br><strong>${i18next.t('helpS63')}:</strong> ${workflowData.sampler}`;
                parameters.innerHTML += `<br><strong>${i18next.t('helpS64')}:</strong> ${workflowData.scheduler}`;
                parameters.innerHTML += `<br><strong>${i18next.t('helpS65')}:</strong> ${workflowData.cfg}`;
                parameters.innerHTML += `<br><strong>${i18next.t('helpS67')}:</strong> ${workflowData.steps}`;
                parameters.innerHTML += `<br><strong>${i18next.t('widthInput')}:</strong> ${workflowData.width}`;
                parameters.innerHTML += `<br><strong>${i18next.t('heightInput')}:</strong> ${workflowData.height}`;
            } else if (workflowData.checkpointName === 'sd3.5_large_turbo-Q8_0.gguf') {
                parameters.innerHTML += `<strong>${i18next.t('modelSelect')}:</strong> Stable Diffusion 3.5 Large Turbo`;
                prompts.innerHTML = `<strong>${i18next.t('positivePrompt')}:</strong> ${workflowData.promptP}`;
                parameters.innerHTML += `<br><strong>${i18next.t('helpS63')}:</strong> ${workflowData.sampler}`;
                parameters.innerHTML += `<br><strong>${i18next.t('helpS64')}:</strong> ${workflowData.scheduler}`;
                parameters.innerHTML += `<br><strong>${i18next.t('helpS67')}:</strong> ${workflowData.steps}`;
                parameters.innerHTML += `<br><strong>${i18next.t('widthInput')}:</strong> ${workflowData.width}`;
                parameters.innerHTML += `<br><strong>${i18next.t('heightInput')}:</strong> ${workflowData.height}`;
            } else if (workflowData.checkpointName === 'sd_xl_turbo_1.0_fp16.safetensors') {
                parameters.innerHTML += `<strong>${i18next.t('modelSelect')}:</strong> Stable Diffusion XL Turbo`;
                prompts.innerHTML = `<strong>${i18next.t('positivePrompt')}:</strong> ${workflowData.promptP}`;
                prompts.innerHTML += `<br><strong>${i18next.t('negativePrompt')}:</strong> ${workflowData.promptN}`;
                parameters.innerHTML += `<br><strong>${i18next.t('helpS63')}:</strong> ${workflowData.sampler}`;
                parameters.innerHTML += `<br><strong>${i18next.t('helpS67')}:</strong> ${workflowData.steps}`;
                parameters.innerHTML += `<br><strong>${i18next.t('widthInput')}:</strong> ${workflowData.width}`;
                parameters.innerHTML += `<br><strong>${i18next.t('heightInput')}:</strong> ${workflowData.height}`;
            } else if (workflowData.checkpointName === 'FLUX1/flux1-dev-Q8_0.gguf' || workflowData.checkpointName === 'flux1-kontext-dev-Q8_0.gguf') {
                parameters.innerHTML += `<strong>${i18next.t('modelSelect')}:</strong> FLUX 1. Dev`;
                if (workflowData.lora == 'None') {
                    parameters.innerHTML += `<br><strong>LoRA:</strong> ${i18next.t('noLora')}`;
                } else {
                    parameters.innerHTML += `<br><strong>LoRA:</strong> ${workflowData.lora}`;
                    parameters.innerHTML += `<br><strong>${i18next.t('helpS612')}:</strong> ${workflowData.loraStrength}`;
                }
                prompts.innerHTML = `<strong>${i18next.t('positivePrompt')}:</strong> ${workflowData.promptP}`;
                parameters.innerHTML += `<br><strong>${i18next.t('helpS63')}:</strong> ${workflowData.sampler}`;
                parameters.innerHTML += `<br><strong>${i18next.t('helpS64')}:</strong> ${workflowData.scheduler}`;
                parameters.innerHTML += `<br><strong>${i18next.t('helpS66')}:</strong> ${workflowData.guidance}`;
                parameters.innerHTML += `<br><strong>${i18next.t('helpS67')}:</strong> ${workflowData.steps}`;
                parameters.innerHTML += `<br><strong>${i18next.t('widthInput')}:</strong> ${workflowData.width}`;
                parameters.innerHTML += `<br><strong>${i18next.t('heightInput')}:</strong> ${workflowData.height}`;
            } else if (workflowData.checkpointName === 'flux1-krea-dev_fp8_scaled.safetensors') {
                parameters.innerHTML += `<strong>${i18next.t('modelSelect')}:</strong> FLUX 1. Krea Dev`;
                prompts.innerHTML = `<strong>${i18next.t('positivePrompt')}:</strong> ${workflowData.promptP}`;
                parameters.innerHTML += `<br><strong>${i18next.t('helpS63')}:</strong> ${workflowData.sampler}`;
                parameters.innerHTML += `<br><strong>${i18next.t('helpS64')}:</strong> ${workflowData.scheduler}`;
                parameters.innerHTML += `<br><strong>${i18next.t('helpS65')}:</strong> ${workflowData.cfg}`;
                parameters.innerHTML += `<br><strong>${i18next.t('helpS67')}:</strong> ${workflowData.steps}`;
                parameters.innerHTML += `<br><strong>${i18next.t('widthInput')}:</strong> ${workflowData.width}`;
                parameters.innerHTML += `<br><strong>${i18next.t('heightInput')}:</strong> ${workflowData.height}`;
            } else if (workflowData.checkpointName === 'PixArt-Sigma-XL-2-2K-MS.pth') {
                parameters.innerHTML += `<strong>${i18next.t('modelSelect')}:</strong> PixArt Sigma XL 2K`;
                prompts.innerHTML = `<strong>${i18next.t('positivePrompt')}:</strong> ${workflowData.promptP}`;
                prompts.innerHTML += `<br><strong>${i18next.t('negativePrompt')}:</strong> ${workflowData.promptN}`;
                parameters.innerHTML += `<br><strong>${i18next.t('helpS63')}:</strong> ${workflowData.sampler}`;
                parameters.innerHTML += `<br><strong>${i18next.t('helpS64')}:</strong> ${workflowData.scheduler}`;
                parameters.innerHTML += `<br><strong>${i18next.t('helpS65')}:</strong> ${workflowData.cfg}`;
                parameters.innerHTML += `<br><strong>${i18next.t('helpS67')}:</strong> ${workflowData.steps}`;
                parameters.innerHTML += `<br><strong>${i18next.t('ratioInput')}:</strong> ${workflowData.ratio}`;
            } else if (workflowData.checkpointName === 'hidream_i1_fast_fp8.safetensors') {
                parameters.innerHTML += `<strong>${i18next.t('modelSelect')}:</strong> HiDream I1 Fast`;
                prompts.innerHTML = `<strong>${i18next.t('positivePrompt')}:</strong> ${workflowData.promptP}`;
                prompts.innerHTML += `<br><strong>${i18next.t('negativePrompt')}:</strong> ${workflowData.promptN}`;
                parameters.innerHTML += `<br><strong>${i18next.t('helpS63')}:</strong> ${workflowData.sampler}`;
                parameters.innerHTML += `<br><strong>${i18next.t('helpS64')}:</strong> ${workflowData.scheduler}`;
                parameters.innerHTML += `<br><strong>${i18next.t('helpS65')}:</strong> ${workflowData.cfg}`;
                parameters.innerHTML += `<br><strong>${i18next.t('helpS67')}:</strong> ${workflowData.steps}`;
                parameters.innerHTML += `<br><strong>${i18next.t('widthInput')}:</strong> ${workflowData.width}`;
                parameters.innerHTML += `<br><strong>${i18next.t('heightInput')}:</strong> ${workflowData.height}`;
            } else if (workflowData.checkpointName === 'VerusVision_1.0b_Transformer_fp8.safetensors') {
                parameters.innerHTML += `<strong>${i18next.t('modelSelect')}:</strong> Verus Vision 1.0b Transformer`;
                prompts.innerHTML = `<strong>${i18next.t('positivePrompt')}:</strong> ${workflowData.promptP}`;
                parameters.innerHTML += `<br><strong>${i18next.t('helpS63')}:</strong> ${workflowData.sampler}`;
                parameters.innerHTML += `<br><strong>${i18next.t('helpS64')}:</strong> ${workflowData.scheduler}`;
                parameters.innerHTML += `<br><strong>${i18next.t('helpS65')}:</strong> ${workflowData.cfg}`;
                parameters.innerHTML += `<br><strong>${i18next.t('helpS67')}:</strong> ${workflowData.steps}`;
                parameters.innerHTML += `<br><strong>${i18next.t('widthInput')}:</strong> ${workflowData.width}`;
                parameters.innerHTML += `<br><strong>${i18next.t('heightInput')}:</strong> ${workflowData.height}`;
            } else if (workflowData.checkpointName === 'lumina_2.safetensors') {
                parameters.innerHTML += `<strong>${i18next.t('modelSelect')}:</strong> Lumina Image 2`;
                prompts.innerHTML = `<strong>${i18next.t('systemPrompt')}:</strong> ${workflowData.promptS}`;
                prompts.innerHTML += `<br><strong>${i18next.t('positivePrompt')}:</strong> ${workflowData.promptP}`;
                prompts.innerHTML += `<br><strong>${i18next.t('negativePrompt')}:</strong> ${workflowData.promptN}`;
                parameters.innerHTML += `<br><strong>${i18next.t('helpS63')}:</strong> ${workflowData.sampler}`;
                parameters.innerHTML += `<br><strong>${i18next.t('helpS64')}:</strong> ${workflowData.scheduler}`;
                parameters.innerHTML += `<br><strong>${i18next.t('helpS65')}:</strong> ${workflowData.cfg}`;
                parameters.innerHTML += `<br><strong>${i18next.t('helpS613')}:</strong> ${workflowData.shift}`;
                parameters.innerHTML += `<br><strong>${i18next.t('helpS67')}:</strong> ${workflowData.steps}`;
                parameters.innerHTML += `<br><strong>${i18next.t('widthInput')}:</strong> ${workflowData.width}`;
                parameters.innerHTML += `<br><strong>${i18next.t('heightInput')}:</strong> ${workflowData.height}`;
            } else if (workflowData.checkpointName === 'qwen-image-Q4_K_M.gguf') {
                parameters.innerHTML += `<strong>${i18next.t('modelSelect')}:</strong> Qwen Image`;
                prompts.innerHTML = `<strong>${i18next.t('positivePrompt')}:</strong> ${workflowData.promptP}`;
                prompts.innerHTML += `<br><strong>${i18next.t('negativePrompt')}:</strong> ${workflowData.promptN}`;
                parameters.innerHTML += `<br><strong>${i18next.t('helpS63')}:</strong> ${workflowData.sampler}`;
                parameters.innerHTML += `<br><strong>${i18next.t('helpS64')}:</strong> ${workflowData.scheduler}`;
                parameters.innerHTML += `<br><strong>${i18next.t('helpS65')}:</strong> ${workflowData.cfg}`;
                parameters.innerHTML += `<br><strong>${i18next.t('helpS613')}:</strong> ${workflowData.shift}`;
                parameters.innerHTML += `<br><strong>${i18next.t('helpS67')}:</strong> ${workflowData.steps}`;
                parameters.innerHTML += `<br><strong>${i18next.t('widthInput')}:</strong> ${workflowData.width}`;
                parameters.innerHTML += `<br><strong>${i18next.t('heightInput')}:</strong> ${workflowData.height}`;
            } else if (workflowData.checkpointName === 'colorizing') {
                parameters.innerHTML += `<strong>${i18next.t('editorSelect')}:</strong> ${i18next.t('colorizing')}`;
                prompts.innerHTML = `<strong>${i18next.t('positivePrompt')}:</strong> ${workflowData.promptP}`;
                prompts.innerHTML += `<br><strong>${i18next.t('negativePrompt')}:</strong> ${workflowData.promptN}`;
                parameters.innerHTML += `<br><strong>${i18next.t('helpS63')}:</strong> ${workflowData.sampler}`;
                parameters.innerHTML += `<br><strong>${i18next.t('helpS64')}:</strong> ${workflowData.scheduler}`;
                parameters.innerHTML += `<br><strong>${i18next.t('helpS65')}:</strong> ${workflowData.cfg}`;
                parameters.innerHTML += `<br><strong>${i18next.t('helpS67')}:</strong> ${workflowData.steps}`;
                parameters.innerHTML += `<br><strong>${i18next.t('blendInput')}:</strong> ${workflowData.blend}`;
            } else if (workflowData.checkpointName === 'upscaling') {
                prompts.hidden = true;
                parameters.innerHTML += `<strong>${i18next.t('editorSelect')}:</strong> ${i18next.t('upscaling')}`;
                parameters.innerHTML += `<br><strong>${i18next.t('upscaleMultiplier')}:</strong> ${workflowData.upscaleMultiplier}`;
            } else if (workflowData.checkpointName === 'outpainting') {
                parameters.innerHTML += `<strong>${i18next.t('editorSelect')}:</strong> ${i18next.t('outpainting')}`;
                prompts.innerHTML = `<strong>${i18next.t('positivePrompt')}:</strong> ${workflowData.promptP}`;
                parameters.innerHTML += `<br><strong>${i18next.t('helpS63')}:</strong> ${workflowData.sampler}`;
                parameters.innerHTML += `<br><strong>${i18next.t('helpS64')}:</strong> ${workflowData.scheduler}`;
                parameters.innerHTML += `<br><strong>${i18next.t('helpS66')}:</strong> ${workflowData.guidance}`;
                parameters.innerHTML += `<br><strong>${i18next.t('helpS67')}:</strong> ${workflowData.steps}`;
                parameters.innerHTML += `<br><strong>${i18next.t('helpS610')}:</strong> ${workflowData.feathering}`;
                parameters.innerHTML += `<br><strong>${i18next.t('lightboxLeftMask')}:</strong> ${workflowData.leftMask}`;
                parameters.innerHTML += `<br><strong>${i18next.t('lightboxTopMask')}:</strong> ${workflowData.topMask}`;
                parameters.innerHTML += `<br><strong>${i18next.t('lightboxRightMask')}:</strong> ${workflowData.rightMask}`;
                parameters.innerHTML += `<br><strong>${i18next.t('lightboxBottomMask')}:</strong> ${workflowData.bottomMask}`;
            }
        } catch (e) {
            console.error("Error displaying metadata from workflow data:", e);
            if (prompts) prompts.innerHTML = "Error loading metadata.";
            if (parameters) parameters.innerHTML = "Error loading metadata.";
        }
    } else {
      if (prompts) prompts.innerHTML = i18next.t('metadataError');
      if (parameters) parameters.innerHTML = i18next.t('metadataUnavailable');
    }
}

export function showDeleteConfirm(imageDeleteUrl) {
    const lightboxTogglePublicBtn = document.getElementById('lightboxTogglePublicButton');

    const confirmModal = document.createElement('div');
    confirmModal.id = "deleteConfirmModal";
    confirmModal.className = "modal-overlay";

    const modalContent = document.createElement('div');
    modalContent.className = "modal-content";

    const confirmMessage = document.createElement('p');
    confirmMessage.textContent = i18next.t('modalConfirm');

    const modalActions = document.createElement('div');
    modalActions.className = "modal-actions";

    const actionYes = document.createElement('button');
    actionYes.className = "modal-button yes";
    actionYes.textContent = i18next.t('modalConfirmYes');
    actionYes.addEventListener('click', () => {
        if (lightboxTogglePublicBtn.classList.contains('is-public')) {
            lightboxTogglePublicBtn.click();
        }
        performDeleteImage(imageDeleteUrl);
    });

    const actionNo = document.createElement('button');
    actionNo.class = "modal-button no";
    actionNo.textContent = i18next.t('modalConfirmNo');
    actionNo.addEventListener('click', hideDeleteConfirm);

    modalActions.appendChild(actionYes);
    modalActions.appendChild(actionNo);
    modalContent.appendChild(confirmMessage);
    modalContent.appendChild(modalActions);
    confirmModal.appendChild(modalContent);
    document.body.appendChild(confirmModal);
}

export function hideDeleteConfirm() {
    const confirmModal = document.getElementById('deleteConfirmModal');
    if (confirmModal) {
        confirmModal.remove();
    }
}

export async function performDeleteImage(imageDeleteUrl) {
    if (!imageDeleteUrl) {
        console.error("No image URL set for deletion.");
        hideDeleteConfirm();
        return;
    }

    try {
        const url = new URL(imageDeleteUrl);
        const pathParts = url.pathname.split('/');
        const filename = pathParts.pop();

        const response = await fetch('/api/delete-image', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ uid: uid, filename: filename }),
        });

        const result = await response.json();

        if (response.ok && result.success) {
            closeLightbox();
            updateGridVariables();
        } else {
            throw new Error(result.error || 'Failed to delete image.');
        }
    } catch (error) {
        console.error('Error deleting image:', error);
    } finally {
        hideDeleteConfirm();
    }
}

export function closeLightbox() {
    const lightbox = document.getElementById('simpleLightbox');
    lightbox?.remove();
}

export function lightboxCopySet(workflowData) {
    positivePrompt.value = workflowData.promptP;
    samplerSelect.value = workflowData.sampler;

    if (workflowData.checkpointName === 'sd_xl_base_1.0.safetensors') {
        negativePrompt.value = workflowData.promptN;
        schedulerSelect.value = workflowData.scheduler;
        cfgInput.value = workflowData.cfg;
        stepsInput.value = workflowData.steps;
        stepsRefineInput.value = workflowData.stepsRefiner;
        widthInput.value = workflowData.width;
        heightInput.value = workflowData.height;
    } else if (workflowData.checkpointName === 'sd3.5_large_fp8_scaled.safetensors') {
        negativePrompt.value = workflowData.promptN;
        schedulerSelect.value = workflowData.scheduler;
        cfgInput.value = workflowData.cfg;
        stepsInput.value = workflowData.steps;
        widthInput.value = workflowData.width;
        heightInput.value = workflowData.height;
    } else if (workflowData.checkpointName === 'sd3.5_large_turbo-Q8_0.gguf') {
        schedulerSelect.value = workflowData.scheduler;
        stepsInput.value = workflowData.steps;
        widthInput.value = workflowData.width;
        heightInput.value = workflowData.height;
    } else if (workflowData.checkpointName === 'sd_xl_turbo_1.0_fp16.safetensors') {
        negativePrompt.value = workflowData.promptN;
        cfgInput.value = workflowData.cfg;
        stepsInput.value = workflowData.steps;
        widthInput.value = workflowData.width;
        heightInput.value = workflowData.height;
    } else if (workflowData.checkpointName === 'FLUX1/flux1-dev-Q8_0.gguf') {
        modelSelect.value = 'flux1-dev-Q8_0.gguf';
        loraSelect.value = workflowData.lora;
        loraStrengthInput.value = workflowData.loraStrength;
        schedulerSelect.value = workflowData.scheduler;
        guidanceInput.value = workflowData.guidance;
        stepsInput.value = workflowData.steps;
        widthInput.value = workflowData.width;
        heightInput.value = workflowData.height;
    } else if (workflowData.checkpointName === 'flux1-krea-dev_fp8_scaled.safetensors') {
        schedulerSelect.value = workflowData.scheduler;
        samplerSelect.value = workflowData.sampler;
        cfgInput.value = workflowData.cfg;
        stepsInput.value = workflowData.steps;
        widthInput.value = workflowData.width;
        heightInput.value = workflowData.height;
    } else if (workflowData.checkpointName === 'PixArt-Sigma-XL-2-2K-MS.pth') {
        negativePrompt.value = workflowData.promptN;
        schedulerSelect.value = workflowData.scheduler;
        cfgInput.value = workflowData.cfg;
        stepsInput.value = workflowData.steps;
        ratioInput.value = workflowData.ratio;
    } else if (workflowData.checkpointName === 'hidream_i1_fast_fp8.safetensors') {
        negativePrompt.value = workflowData.promptN;
        schedulerSelect.value = workflowData.scheduler;
        cfgInput.value = workflowData.cfg;
        stepsInput.value = workflowData.steps;
        widthInput.value = workflowData.width;
        heightInput.value = workflowData.height;
    } else if (workflowData.checkpointName === 'VerusVision_1.0b_Transformer_fp8.safetensors') {
        schedulerSelect.value = workflowData.scheduler;
        cfgInput.value = workflowData.cfg;
        stepsInput.value = workflowData.steps;
        widthInput.value = workflowData.width;
        heightInput.value = workflowData.height;
    } else if (workflowData.checkpointName === 'lumina_2.safetensors') {
        negativePrompt.value = workflowData.promptN;
        systemPrompt.value = workflowData.promptS;
        schedulerSelect.value = workflowData.scheduler;
        cfgInput.value = workflowData.cfg;
        shiftInput.value = workflowData.shift;
        stepsInput.value = workflowData.steps;
        widthInput.value = workflowData.width;
        heightInput.value = workflowData.height;
    } else if (workflowData.checkpointName === 'qwen-image-Q4_K_M.gguf') {
        negativePrompt.value = workflowData.promptN;
        schedulerSelect.value = workflowData.scheduler;
        cfgInput.value = workflowData.cfg;
        shiftInput.value = workflowData.shift;
        stepsInput.value = workflowData.steps;
        widthInput.value = workflowData.width;
        heightInput.value = workflowData.height;
    } else if (workflowData.checkpointName === 'colorizing') {
        switchTab('editor');
        editorSelect.value = 'colorizing';
        positivePrompt.value = workflowData.promptP;
        negativePrompt.value = workflowData.promptN;
        schedulerSelect.value = workflowData.scheduler;
        cfgInput.value = workflowData.cfg;
        stepsInput.value = workflowData.steps;
        blendInput.value = workflowData.blend;
    } else if (workflowData.checkpointName === 'upscaling') {
        switchTab('editor');
        editorSelect.value = 'upscaling';
        upscaleMultiplier.value = workflowData.upscaleMultiplier;
    } else if (workflowData.checkpointName === 'outpainting') {
        switchTab('editor');
        editorSelect.value = 'outpainting';
        positivePrompt.value = workflowData.promptP;
        samplerSelect.value = workflowData.sampler;
        schedulerSelect.value = workflowData.scheduler;
        guidanceInput.value = workflowData.guidance;
        stepsInput.value = workflowData.steps;
        featheringInput.value = workflowData.feathering;
        leftMask.value = workflowData.leftMask;
        topMask.value = workflowData.topMask;
        rightMask.value = workflowData.rightMask;
        bottomMask.value = workflowData.bottomMask;
    }
}