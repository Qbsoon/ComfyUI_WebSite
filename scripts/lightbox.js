import { lightboxVars, editors, uid } from './main.js';
import { updateGridVariables } from './main.js';
import { switchTab } from './formUpdate.js';

// Odnośniki
const lightbox = document.getElementById('simpleLightbox');
const lightboxImage = document.getElementById('lightboxImage');
const deleteBtn = document.getElementById('lightboxDeleteButton');
const lightboxTogglePublicBtn = document.getElementById('lightboxTogglePublicButton');
const lightboxCopyParametersBtn = document.getElementById('lightboxCopyParametersButton');
const lightboxEditImageBtn = document.getElementById('lightboxEditImageButton');
const prompts = document.getElementById('lightboxPrompts');
const parameters = document.getElementById('lightboxParameters');
const comparison = document.getElementById('lightboxComparison');

const modelSelect = document.getElementById('modelSelect');
const editorSelect = document.getElementById('editorSelect');
const positivePrompt = document.getElementById('positivePrompt');
const negativePrompt = document.getElementById('negativePrompt');
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

export function openLightbox(imageUrl, workflowData, imageOwnerUid = null, isPublic = false, filename = null) {
    if (lightbox && lightboxImage) {
        lightboxImage.hidden = false;
        lightboxImage.src = imageUrl;
        lightbox.style.display = 'flex';

        lightboxVars.currentLightboxImageOwnerUid = imageOwnerUid || uid;
        lightboxVars.currentLightboxImageFilename = filename || imageUrl.substring(imageUrl.lastIndexOf('/') + 1);

        if (deleteBtn) {
            deleteBtn.dataset.imageUrl = imageUrl;
            // Only show delete button if the current user owns the image in the lightbox
            deleteBtn.style.display = (lightboxVars.currentLightboxImageOwnerUid === uid) ? 'inline-block' : 'none';
        }

        if (lightboxEditImageBtn) {
            lightboxEditImageBtn.style.display = (lightboxVars.currentLightboxImageOwnerUid === uid) ? 'inline-block' : 'none';
        }

        if (lightboxTogglePublicBtn) {
            lightboxTogglePublicBtn.dataset.filename = lightboxVars.currentLightboxImageFilename;
            lightboxTogglePublicBtn.dataset.ownerUid = lightboxVars.currentLightboxImageOwnerUid;
            if (isPublic) {
                lightboxTogglePublicBtn.textContent = 'Hide from public';
                lightboxTogglePublicBtn.classList.add('is-public');
            } else {
                lightboxTogglePublicBtn.textContent = 'Show in public';
                lightboxTogglePublicBtn.classList.remove('is-public');
            }
            // Only show toggle public button if the current user owns the image
            lightboxTogglePublicBtn.style.display = (lightboxVars.currentLightboxImageOwnerUid === uid) ? 'inline-block' : 'none';
        }

        if (lightboxCopyParametersBtn) {
            lightboxCopyParametersBtn.dataset.workflowData = JSON.stringify(workflowData);
        } else {
            console.warn("Lightbox copy parameters button not found.");
        }

        if (lightboxEditImageBtn) {
            lightboxEditImageBtn.dataset.filename = lightboxVars.currentLightboxImageFilename;
        }
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
                    alert('Failed to load the generated image. Please check the server response.');
                };
                img.className = "comparison-image image-top";
                img.alt = "After";
            
                const imgBefore = document.createElement('img');
                imgBefore.src = `gallery/${imageBeforeUrl}`;
                imgBefore.className = "comparison-image image-bottom";
                imgBefore.alt = "Before";
                imgBefore.onerror = () => {
                    alert('Failed to load the generated image. Please check the server response.');
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
                parameters.innerHTML += `<strong>Shared by:</strong> ${imageOwnerUid}<br>`;
            }
            if (workflowData.checkpointName === 'sd_xl_base_1.0.safetensors') {
                parameters.innerHTML += `<strong>Model:</strong> Stable Diffusion XL`;
                prompts.innerHTML = `<strong>Positive Prompt:</strong> ${workflowData.promptP}`;
                prompts.innerHTML += `<br><strong>Negative Prompt:</strong> ${workflowData.promptN}`;
                parameters.innerHTML += `<br><strong>Sampler:</strong> ${workflowData.sampler}`;
                parameters.innerHTML += `<br><strong>Scheduler:</strong> ${workflowData.scheduler}`;
                parameters.innerHTML += `<br><strong>CFG:</strong> ${workflowData.cfg}`;
                parameters.innerHTML += `<br><strong>Steps:</strong> ${workflowData.steps}`;
                parameters.innerHTML += `<br><strong>Refiner Steps:</strong> ${workflowData.stepsRefiner}`;
                parameters.innerHTML += `<br><strong>Width:</strong> ${workflowData.width}`;
                parameters.innerHTML += `<br><strong>Height:</strong> ${workflowData.height}`;
            } else if (workflowData.checkpointName === 'sd3.5_large_fp8_scaled.safetensors') {
                parameters.innerHTML += `<strong>Model:</strong> Stable Diffusion 3.5 Large (fp8)`;
                prompts.innerHTML = `<strong>Positive Prompt:</strong> ${workflowData.promptP}`;
                prompts.innerHTML += `<br><strong>Negative Prompt:</strong> ${workflowData.promptN}`;
                parameters.innerHTML += `<br><strong>Sampler:</strong> ${workflowData.sampler}`;
                parameters.innerHTML += `<br><strong>Scheduler:</strong> ${workflowData.scheduler}`;
                parameters.innerHTML += `<br><strong>CFG:</strong> ${workflowData.cfg}`;
                parameters.innerHTML += `<br><strong>Steps:</strong> ${workflowData.steps}`;
                parameters.innerHTML += `<br><strong>Width:</strong> ${workflowData.width}`;
                parameters.innerHTML += `<br><strong>Height:</strong> ${workflowData.height}`;
            } else if (workflowData.checkpointName === 'sd_xl_turbo_1.0_fp16.safetensors') {
                parameters.innerHTML += `<strong>Model:</strong> Stable Diffusion XL Turbo (fp16)`;
                prompts.innerHTML = `<strong>Positive Prompt:</strong> ${workflowData.promptP}`;
                prompts.innerHTML += `<br><strong>Negative Prompt:</strong> ${workflowData.promptN}`;
                parameters.innerHTML += `<br><strong>Sampler:</strong> ${workflowData.sampler}`;
                parameters.innerHTML += `<br><strong>CFG:</strong> ${workflowData.cfg}`;
                parameters.innerHTML += `<br><strong>Steps:</strong> ${workflowData.steps}`;
                parameters.innerHTML += `<br><strong>Width:</strong> ${workflowData.width}`;
                parameters.innerHTML += `<br><strong>Height:</strong> ${workflowData.height}`;
            } else if (workflowData.checkpointName === 'FLUX1/flux1-dev-Q8_0.gguf' || workflowData.checkpointName === 'flux1-kontext-dev-Q8_0.gguf') {
                parameters.innerHTML += `<strong>Model:</strong> FLUX 1. Dev (Q8)`;
                parameters.innerHTML += `<br><strong>Lora:</strong> ${workflowData.lora}`;
                if (workflowData.lora !== 'none') {
                    parameters.innerHTML += `<br><strong>Lora Strength:</strong> ${workflowData.loraStrength}`;
                }
                prompts.innerHTML = `<strong>Positive Prompt:</strong> ${workflowData.promptP}`;
                parameters.innerHTML += `<br><strong>Sampler:</strong> ${workflowData.sampler}`;
                parameters.innerHTML += `<br><strong>Scheduler:</strong> ${workflowData.scheduler}`;
                parameters.innerHTML += `<br><strong>Guidance:</strong> ${workflowData.guidance}`;
                parameters.innerHTML += `<br><strong>Steps:</strong> ${workflowData.steps}`;
                parameters.innerHTML += `<br><strong>Width:</strong> ${workflowData.width}`;
                parameters.innerHTML += `<br><strong>Height:</strong> ${workflowData.height}`;
            } else if (workflowData.checkpointName === 'PixArt-Sigma-XL-2-2K-MS.pth') {
                parameters.innerHTML += `<strong>Model:</strong> PixArt Sigma XL 2K`;
                prompts.innerHTML = `<strong>Positive Prompt:</strong> ${workflowData.promptP}`;
                prompts.innerHTML += `<br><strong>Negative Prompt:</strong> ${workflowData.promptN}`;
                parameters.innerHTML += `<br><strong>Sampler:</strong> ${workflowData.sampler}`;
                parameters.innerHTML += `<br><strong>Scheduler:</strong> ${workflowData.scheduler}`;
                parameters.innerHTML += `<br><strong>CFG:</strong> ${workflowData.cfg}`;
                parameters.innerHTML += `<br><strong>Steps:</strong> ${workflowData.steps}`;
                parameters.innerHTML += `<br><strong>Ratio:</strong> ${workflowData.ratio}`;
            } else if (workflowData.checkpointName === 'hidream_i1_fast_fp8.safetensors') {
                parameters.innerHTML += `<strong>Model:</strong> HiDream I1 Fast (fp8)`;
                prompts.innerHTML = `<strong>Positive Prompt:</strong> ${workflowData.promptP}`;
                prompts.innerHTML += `<br><strong>Negative Prompt:</strong> ${workflowData.promptN}`;
                parameters.innerHTML += `<br><strong>Sampler:</strong> ${workflowData.sampler}`;
                parameters.innerHTML += `<br><strong>Scheduler:</strong> ${workflowData.scheduler}`;
                parameters.innerHTML += `<br><strong>CFG:</strong> ${workflowData.cfg}`;
                parameters.innerHTML += `<br><strong>Steps:</strong> ${workflowData.steps}`;
                parameters.innerHTML += `<br><strong>Width:</strong> ${workflowData.width}`;
                parameters.innerHTML += `<br><strong>Height:</strong> ${workflowData.height}`;
            } else if (workflowData.checkpointName === 'VerusVision_1.0b_Transformer_fp8.safetensors') {
                parameters.innerHTML += `<strong>Model:</strong> Verus Vision 1.0b Transformer (fp8)`;
                prompts.innerHTML = `<strong>Positive Prompt:</strong> ${workflowData.promptP}`;
                parameters.innerHTML += `<br><strong>Sampler:</strong> ${workflowData.sampler}`;
                parameters.innerHTML += `<br><strong>Scheduler:</strong> ${workflowData.scheduler}`;
                parameters.innerHTML += `<br><strong>CFG:</strong> ${workflowData.cfg}`;
                parameters.innerHTML += `<br><strong>Steps:</strong> ${workflowData.steps}`;
                parameters.innerHTML += `<br><strong>Width:</strong> ${workflowData.width}`;
                parameters.innerHTML += `<br><strong>Height:</strong> ${workflowData.height}`;
            } else if (workflowData.checkpointName === 'colorizing') {
                parameters.innerHTML += `<strong>Edition type:</strong> Colorizing`;
                prompts.innerHTML = `<strong>Positive Prompt:</strong> ${workflowData.promptP}`;
                prompts.innerHTML += `<br><strong>Negative Prompt:</strong> ${workflowData.promptN}`;
                parameters.innerHTML += `<br><strong>Sampler:</strong> ${workflowData.sampler}`;
                parameters.innerHTML += `<br><strong>Scheduler:</strong> ${workflowData.scheduler}`;
                parameters.innerHTML += `<br><strong>CFG:</strong> ${workflowData.cfg}`;
                parameters.innerHTML += `<br><strong>Steps:</strong> ${workflowData.steps}`;
                parameters.innerHTML += `<br><strong>Blend:</strong> ${workflowData.blend}`;
            } else if (workflowData.checkpointName === 'upscaling') {
                prompts.hidden = true;
                parameters.innerHTML += `<strong>Edition type:</strong> Upscaling`;
                parameters.innerHTML += `<br><strong>Upscale Multiplier:</strong> ${workflowData.upscaleMultiplier}`;
            } else if (workflowData.checkpointName === 'outpainting') {
                parameters.innerHTML += `<strong>Edition type:</strong> Outpainting`;
                prompts.innerHTML = `<strong>Positive Prompt:</strong> ${workflowData.promptP}`;
                parameters.innerHTML += `<br><strong>Sampler:</strong> ${workflowData.sampler}`;
                parameters.innerHTML += `<br><strong>Scheduler:</strong> ${workflowData.scheduler}`;
                parameters.innerHTML += `<br><strong>Guidance:</strong> ${workflowData.guidance}`;
                parameters.innerHTML += `<br><strong>Steps:</strong> ${workflowData.steps}`;
                parameters.innerHTML += `<br><strong>Feathering:</strong> ${workflowData.feathering}`;
                parameters.innerHTML += `<br><strong>Left Mask:</strong> ${workflowData.leftMask}`;
                parameters.innerHTML += `<br><strong>Top Mask:</strong> ${workflowData.topMask}`;
                parameters.innerHTML += `<br><strong>Right Mask:</strong> ${workflowData.rightMask}`;
                parameters.innerHTML += `<br><strong>Bottom Mask:</strong> ${workflowData.bottomMask}`;
            }
        } catch (e) {
            console.error("Error displaying metadata from workflow data:", e);
            if (prompts) prompts.innerHTML = "Error loading metadata.";
            if (parameters) parameters.innerHTML = "Error loading metadata.";
        }
    } else {
      if (prompts) prompts.innerHTML = "Metadata not available.";
      if (parameters) parameters.innerHTML = "Metadata not available.";
    }
}

export function showCustomConfirm() {
    if (customConfirmModal) {
        customConfirmModal.style.display = 'flex';
    }
}

export function hideCustomConfirm() {
    if (customConfirmModal) {
        customConfirmModal.style.display = 'none';
    }
    lightboxVars.currentImageToDeleteUrl = null;
}

export async function performDeleteImage() {
    if (!lightboxVars.currentImageToDeleteUrl) {
        console.error("No image URL set for deletion.");
        hideCustomConfirm();
        return;
    }

    try {
        const url = new URL(lightboxVars.currentImageToDeleteUrl);
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
        hideCustomConfirm();
    }
}

export function closeLightbox() {
  if (lightbox) {
    lightbox.style.display = 'none';
    lightboxImage.src = '';
    if (lightboxImage) lightboxImage.src = '';
    if (deleteBtn) deleteBtn.dataset.imageUrl = '';
  }
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