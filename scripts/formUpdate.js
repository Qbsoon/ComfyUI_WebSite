import { queue } from './main.js';
import { updateGridVariables } from './main.js';

// Odnośniki
const mainContainer = document.getElementById('mainContainer');
const galleryContainerTab = document.getElementById('galleryContainerTab');
const publicGalleryContainerTab = document.getElementById('publicGalleryContainerTab');
const generatorTab = document.getElementById('generatorTab');
const editorTab = document.getElementById('editorTab');
const galleryTab = document.getElementById('galleryTab');
const publicGalleryTab = document.getElementById('publicGalleryTab');

const modelParameters = document.getElementById('modelParameters');
const editorParameters = document.getElementById('editorParameters');

const modelSelect = document.getElementById('modelSelect');
const editorSelect = document.getElementById('editorSelect');
const positivePromptBox = document.getElementById('positivePromptBox');
const negativePromptBox = document.getElementById('negativePromptBox');
const positivePrompt = document.getElementById('positivePrompt');
const negativePrompt = document.getElementById('negativePrompt');
const stepsRefineInput = document.getElementById('stepsRefineInput');
const stepsRefineLabel = document.getElementById('stepsRefineLabel');
const schedulerSelect = document.getElementById('schedulerSelect');
const schedulerLabel = document.getElementById('schedulerLabel');
const samplerSelect = document.getElementById('samplerSelect');
const samplerLabel = document.getElementById('samplerLabel');
const cfgInput = document.getElementById('cfgInput');
const cfgLabel = document.getElementById('cfgLabel');
const guidanceInput = document.getElementById('guidanceInput');
const guidanceLabel = document.getElementById('guidanceLabel');
const ratioLabel = document.getElementById('ratioLabel');
const ratioInput = document.getElementById('ratioInput');
const widthInput = document.getElementById('widthInput');
const widthLabel = document.getElementById('widthLabel');
const heightInput = document.getElementById('heightInput');
const heightLabel = document.getElementById('heightLabel');
const ratioOutput = document.getElementById('ratioOutput');
const stepsInput = document.getElementById('stepsInput');
const stepsLabel = document.getElementById('stepsLabel');
const blendInput = document.getElementById('blendInput');
const blendLabel = document.getElementById('blendLabel');
const loraSelect = document.getElementById('loraSelect');
const loraLabel = document.getElementById('loraLabel');
const loraStrengthInput = document.getElementById('loraStrengthInput');
const loraStrengthLabel = document.getElementById('loraStrengthLabel');
const featheringInput = document.getElementById('featheringInput');
const featheringLabel = document.getElementById('featheringLabel');
const leftMask = document.getElementById('leftMask');
const leftMaskLabel = document.getElementById('leftMaskLabel');
const topMask = document.getElementById('topMask');
const topMaskLabel = document.getElementById('topMaskLabel');
const rightMask = document.getElementById('rightMask');
const rightMaskLabel = document.getElementById('rightMaskLabel');
const bottomMask = document.getElementById('bottomMask');
const bottomMaskLabel = document.getElementById('bottomMaskLabel');

export function changeModel() {
    if (generatorTab.classList.contains('active')) {
        // Default behavior, for SD3.5 & HDi1f
        positivePromptBox.hidden = false;
        negativePromptBox.hidden = false;
        positivePrompt.placeholder = "Elvish sword";
        negativePrompt.placeholder = "Bad";
        stepsRefineInput.hidden = true;
        stepsRefineLabel.hidden = true;
        schedulerSelect.hidden = false;
        schedulerLabel.hidden = false;
        cfgInput.hidden = false;
        cfgLabel.hidden = false;
        guidanceInput.hidden = true;
        guidanceLabel.hidden = true;
        ratioLabel.hidden = true;
        ratioInput.hidden = true;
        widthInput.hidden = false;
        widthLabel.hidden = false;
        heightInput.hidden = false;
        heightLabel.hidden = false;
        ratioOutput.hidden = false;
        stepsInput.hidden = false;
        stepsLabel.hidden = false;
        stepsInput.max = 70;
        blendInput.hidden = true;
        blendLabel.hidden = true;
        loraSelect.hidden = true;
        loraLabel.hidden = true;
        loraStrengthInput.hidden = true;
        loraStrengthLabel.hidden = true;
        featheringInput.hidden = true;
        featheringLabel.hidden = true;
        leftMask.hidden = true;
        leftMaskLabel.hidden = true;
        topMask.hidden = true;
        topMaskLabel.hidden = true;
        rightMask.hidden = true;
        rightMaskLabel.hidden = true;
        bottomMask.hidden = true;
        bottomMaskLabel.hidden = true;

        if (modelSelect.value === 'sd_xl_base_1.0.safetensors') {
            stepsRefineInput.hidden = false;
            stepsRefineLabel.hidden = false;
        } 
        if (modelSelect.value === 'sd_xl_turbo_1.0_fp16.safetensors') {
            schedulerSelect.hidden = true;
            schedulerLabel.hidden = true;
            cfgInput.hidden = true;
            cfgLabel.hidden = true;
            stepsInput.max = 10;
        } 
        if (modelSelect.value === 'flux1-dev-Q8_0.gguf') {
            negativePromptBox.hidden = true;
            cfgInput.hidden = true;
            cfgLabel.hidden = true;
            guidanceInput.hidden = false;
            guidanceLabel.hidden = false;
            loraSelect.hidden = false;
            loraLabel.hidden = false;
            loraStrengthInput.hidden = false;
            loraStrengthLabel.hidden = false;
        } 
        if (modelSelect.value === 'PixArt-Sigma-XL-2-2K-MS.pth') {
            ratioLabel.hidden = false;
            ratioInput.hidden = false;
            widthInput.hidden = true;
            widthLabel.hidden = true;
            heightInput.hidden = true;
            heightLabel.hidden = true;
            ratioOutput.hidden = true;
        }
        if (modelSelect.value === 'VerusVision_1.0b_Transformer_fp8.safetensors') {
            negativePromptBox.hidden = true;
        }
    } else if (editorTab.classList.contains('active')) {
        positivePromptBox.hidden = true;
        negativePromptBox.hidden = true;
        stepsInput.hidden = true;
        stepsLabel.hidden = true;
        stepsRefineInput.hidden = true;
        stepsRefineLabel.hidden = true;
        schedulerSelect.hidden = true;
        schedulerLabel.hidden = true;
        samplerSelect.hidden = true;
        samplerLabel.hidden = true;
        cfgInput.hidden = true;
        cfgLabel.hidden = true;
        guidanceInput.hidden = true;
        guidanceLabel.hidden = true;
        ratioLabel.hidden = true;
        ratioInput.hidden = true;
        widthInput.hidden = true;
        widthLabel.hidden = true;
        heightInput.hidden = true;
        heightLabel.hidden = true;
        ratioOutput.hidden = true;
        blendInput.hidden = true;
        blendLabel.hidden = true;
        loraSelect.hidden = true;
        loraLabel.hidden = true;
        loraStrengthInput.hidden = true;
        loraStrengthLabel.hidden = true;
        featheringInput.hidden = true;
        featheringLabel.hidden = true;
        leftMask.hidden = true;
        leftMaskLabel.hidden = true;
        topMask.hidden = true;
        topMaskLabel.hidden = true;
        rightMask.hidden = true;
        rightMaskLabel.hidden = true;
        bottomMask.hidden = true;
        bottomMaskLabel.hidden = true;
        if (editorSelect.value === 'colorizing') {
            positivePromptBox.hidden = false;
            positivePrompt.placeholder = "vibrant, color portrait photo, (masterpiece), sharp, high quality, 8k, epic";
            negativePromptBox.hidden = false;
            negativePrompt.placeholder = "vintage, grayscale, grain, blur  CGI, Unreal, Airbrushed, Digital, sepia, watermark";
            samplerSelect.hidden = false;
            samplerLabel.hidden = false;
            schedulerSelect.hidden = false;
            schedulerLabel.hidden = false;
            cfgInput.hidden = false;
            cfgLabel.hidden = false;
            stepsInput.hidden = false;
            stepsLabel.hidden = false;
            stepsInput.max = 10;
            blendInput.hidden = false;
            blendLabel.hidden = false;
        } else if (editorSelect.value === 'outpainting') {
            positivePromptBox.hidden = false;
            samplerSelect.hidden = false;
            samplerLabel.hidden = false;
            schedulerSelect.hidden = false;
            schedulerLabel.hidden = false;
            guidanceInput.hidden = false;
            guidanceLabel.hidden = false;
            stepsInput.hidden = false;
            stepsLabel.hidden = false;
            featheringInput.hidden = false;
            featheringLabel.hidden = false;
            leftMask.hidden = false;
            leftMaskLabel.hidden = false;
            topMask.hidden = false;
            topMaskLabel.hidden = false;
            rightMask.hidden = false;
            rightMaskLabel.hidden = false;
            bottomMask.hidden = false;
            bottomMaskLabel.hidden = false;
        }
    }
}

export function switchTab(tab) {
    let current_active_tab = null;

    if (generatorTab.classList.contains('active') && tab === 'generator') {
        current_active_tab = 'generator';
    } else if (editorTab.classList.contains('active') && tab === 'editor') {
        current_active_tab = 'editor';
    }
    generatorTab.classList.remove('active');
    editorTab.classList.remove('active');
    galleryTab.classList.remove('active');
    publicGalleryTab.classList.remove('active');
    mainContainer.style.display = 'none';
    modelParameters.style.display = 'none';
    editorParameters.style.display = 'none';
    galleryContainerTab.style.display = 'none';
    publicGalleryContainerTab.style.display = 'none';

    if (tab === 'generator') {
        generatorTab.classList.add('active');
        mainContainer.style.display = 'grid';
        mainContainer.style.gridTemplateColumns = `1fr 1fr`;
        modelParameters.style.display = 'flex';
        document.getElementById('queueOutput').innerText = `Queue: ${queue.queue}/${queue.queueLimit}`;
        if (current_active_tab !== 'generator') {
            changeModel();
            restoreModelDefaults();
        }
        updateGridVariables();
    } else if (tab === 'editor') {
        editorTab.classList.add('active');
        mainContainer.style.display = 'grid';
        mainContainer.style.gridTemplateColumns = `1fr 1fr`;
        editorParameters.style.display = 'flex';
        document.getElementById('queueOutput').innerText = `Queue: ${queue.queue}/${queue.queueLimit}`;
        if (current_active_tab !== 'editor') {
            changeModel();
            restoreModelDefaults();
        }
        updateGridVariables();
    } else if (tab === 'gallery') {
        galleryTab.classList.add('active');
        galleryContainerTab.style.display = 'grid';
        updateGridVariables();
    } else if (tab === 'publicGallery') {
        publicGalleryTab.classList.add('active');
        publicGalleryContainerTab.style.display = 'grid';
        updateGridVariables();
    }
}

export function restoreModelDefaults() {
    const checkpointName = modelSelect.value;
    const editorCheckpointName = editorSelect.value;
    if (generatorTab.classList.contains('active')) {
        if (checkpointName === 'sd_xl_base_1.0.safetensors') {
            schedulerSelect.value = "normal";
            samplerSelect.value = "euler";
            cfgInput.value = 8;
            stepsInput.value = 20;
            stepsRefineInput.value = 5;
            widthInput.value = 1024;
            heightInput.value = 1024;
        } else if (checkpointName === 'sd3.5_large_fp8_scaled.safetensors') {
            schedulerSelect.value = "sgm_uniform";
            samplerSelect.value = "euler";
            cfgInput.value = 4;
            stepsInput.value = 20;
            widthInput.value = 1024;
            heightInput.value = 1024;
        } else if (checkpointName === 'sd_xl_turbo_1.0_fp16.safetensors') {
            samplerSelect.value = "euler_ancestral";
            cfgInput.value = 1;
            stepsInput.value = 5;
            widthInput.value = 512;
            heightInput.value = 512;
        } else if (checkpointName === 'flux1-dev-Q8_0.gguf') {
            schedulerSelect.value = "normal";
            samplerSelect.value = "euler";
            guidanceInput.value = 2;
            stepsInput.value = 25;
            widthInput.value = 1024;
            heightInput.value = 1024;
            loraSelect.value = "none";
            loraStrengthInput.value = 0.7;
        } else if (checkpointName === 'PixArt-Sigma-XL-2-2K-MS.pth') {
            schedulerSelect.value = "normal";
            samplerSelect.value = "euler_ancestral";
            cfgInput.value = 7;
            stepsInput.value = 20;
            ratioInput.value = 1;
        } else if (checkpointName === 'hidream_i1_fast_fp8.safetensors') {
            schedulerSelect.value = 'normal';
            samplerSelect.value = 'lcm';
            cfgInput.value = 1;
            stepsInput.value = 16;
            widthInput.value = 1024;
            heightInput.value = 1024;
        } else if (checkpointName === 'VerusVision_1.0b_Transformer_fp8.safetensors') {
            schedulerSelect.value = 'beta';
            samplerSelect.value = 'euler';
            cfgInput.value = 3.5;
            stepsInput.value = 25;
            widthInput.value = 1024;
            heightInput.value = 1024;
        }
    } else if (editorTab.classList.contains('active')) {
        if (editorCheckpointName === 'colorizing') {
            schedulerSelect.value = "karras";
            samplerSelect.value = "dpmpp_sde";
            cfgInput.value = 1.98;
            stepsInput.value = 5;
            blendInput.value = 0.7;
        } else if (editorCheckpointName === 'outpainting') {
            schedulerSelect.value = "normal";
            samplerSelect.value = "euler";
            guidanceInput.value = 30.0;
            stepsInput.value = 20;
            featheringInput.value = 24;
            leftMask.value = 0;
            topMask.value = 0;
            rightMask.value = 0;
            bottomMask.value = 0;
        }
    }
}

export function restoreModelDefaultPrompts() {
    const checkpointName = modelSelect.value;
    const editorCheckpointName = editorSelect.value;
    if (editorTab.classList.contains('active')) {
        if (editorCheckpointName === 'colorizing') {
            positivePrompt.value = "vibrant, color portrait photo, (masterpiece), sharp, high quality, 8k, epic";
            negativePrompt.value = "vintage, grayscale, grain, blur  CGI, Unreal, Airbrushed, Digital, sepia, watermark";
        }
    }
}