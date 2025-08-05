import { i18next } from './main.js';

export function sanitizeInput(input) {
    const div = document.createElement('div');
    div.innerText = input;
    return div.innerHTML;
}

export function validateInputs() {
    const positivePrompt = sanitizeInput(document.getElementById('positivePrompt').value.trim());
    const cfgInput = parseFloat(document.getElementById('cfgInput').value);
    const stepsInput = parseInt(document.getElementById('stepsInput').value);
    const stepsRefineInput = parseInt(document.getElementById('stepsRefineInput').value);
    const guidanceInput = parseFloat(document.getElementById('guidanceInput').value);
    const widthInput = parseInt(document.getElementById('widthInput').value);
    const heightInput = parseInt(document.getElementById('heightInput').value);
    const ratioInput = parseFloat(document.getElementById('ratioInput').value);
    const blendInput = parseFloat(document.getElementById('blendInput').value);
    const lora = document.getElementById('loraSelect').value;
    const loraStrength = parseFloat(document.getElementById('loraStrengthInput').value);
	const leftMask = parseInt(document.getElementById('leftMask').value);
	const topMask = parseInt(document.getElementById('topMask').value);
	const rightMask = parseInt(document.getElementById('rightMask').value);
	const bottomMask = parseInt(document.getElementById('bottomMask').value);
	const featheringInput = parseInt(document.getElementById('featheringInput').value);
    var stepsMaxLimit = 70;
    var guidanceMaxLimit = 10.0;
    const model = document.getElementById('modelSelect').value;
    const editor = document.getElementById('editorSelect').value;
    const isEditing = document.getElementById('editorTab')?.classList.contains('active');
    const fn = document.getElementById('imageInput').value.trim();
    const upscaleMultiplier = parseFloat(document.getElementById('upscaleMultiplier').value);
    const shift = parseFloat(document.getElementById('shiftInput').value);

    if (isEditing) {
        if (editor === 'upscaling') {
            if (heightInput*upscaleMultiplier > 4000 || widthInput*upscaleMultiplier > 4000) {
                alert(i18next.t('validResultingSize'));
                throw new Error('Validation failed on upscale dimensions');
            }
        } else if (editor === 'outpainting') {
            if (heightInput+topMask+bottomMask > 4000 || widthInput+leftMask+rightMask > 4000) {
                alert(i18next.t('validResultingSize'));
                throw new Error('Validation failed on outpainting dimensions');
            }
        }
    }

    if (model === 'sd_xl_turbo_1.0_fp16.safetensors') {
        stepsMaxLimit = 10;
    }

    if (isEditing && editor === 'outpainting') {
        guidanceMaxLimit = 50.0;
    }

    if (!positivePrompt && (editor !== 'upscaling')) {
        alert(i18next.t('validNoPositivePrompt'));
        throw new Error('Validation failed on positivePrompt')
    }

    if (isNaN(cfgInput) || cfgInput < 1.0 || cfgInput > 10.0) {
        alert(i18next.t('validCFG'));
        throw new Error('Validation failed on cfgInput')
    }

    if (isNaN(guidanceInput) || guidanceInput < 1.0 || guidanceInput > guidanceMaxLimit) {
        alert(`${i18next.t('validGuidance')} ${guidanceMaxLimit}.`);
        throw new Error('Validation failed on guidanceInput')
    }

    if (isNaN(stepsInput) || stepsInput < 1 || stepsInput > stepsMaxLimit || !Number.isInteger(stepsInput)) {
        alert(`${i18next.t('validSteps')} ${stepsMaxLimit}.`);
        throw new Error('Validation failed on stepsInput')
    }

    if (model === 'sd_xl_base_1.0.safetensors' && (isNaN(stepsRefineInput) || stepsRefineInput < 1 || stepsRefineInput+stepsInput > stepsMaxLimit || !Number.isInteger(stepsRefineInput))) {
        alert(`${validStepsRefine} ${stepsMaxLimit}.`);
        throw new Error('Validation failed on stepsRefineInput')
    }

    if (isNaN(widthInput) || widthInput < 64 || widthInput > 2048 || !Number.isInteger(widthInput)) {
        alert(i18next.t('validWidth'));
        throw new Error('Validation failed on widthInput')
    }
    if (isNaN(heightInput) || heightInput < 64 || heightInput > 2048 || !Number.isInteger(heightInput)) {
        alert(i18next.t('validHeight'));
        throw new Error('Validation failed on heightInput')
    }
    if (isNaN(ratioInput) || ratioInput < 0.25 || ratioInput > 4.0) {
        alert(i18next.t('validRatio'));
        throw new Error('Validation failed on ratioInput')
    }
    if ((model === 'lumina_2.safetensors' || model == 'qwen-image-Q4_K_M.gguf') && (isNaN(shift) || shift < 0.0 || shift > 10.0)) {
        alert(i18next.t('validShift'));
        throw new Error('Validation failed on shiftInput');
    } 
    if (editor === 'colorizing' && (isNaN(blendInput) || blendInput < 0.0 || blendInput > 1.0)) {
        alert(i18next.t('validBlend'));
        throw new Error('Validation failed on blendInput');
    }
    if (!isEditing && model === 'flux1-dev-Q8_0.gguf' && lora !== 'none' && (isNaN(loraStrength) || loraStrength < -1.0 || loraStrength > 2.0)) {
        alert(i18next.t('validLoraStrength'));
        throw new Error('Validation failed on loraStrengthInput');
    }
    if (isEditing && editor === 'outpainting' && ((leftMask < 0 || leftMask > 1024) || (topMask < 0 || topMask > 1024) || (rightMask < 0 || rightMask > 1024) || (bottomMask < 0 || bottomMask > 1024))) {
        alert(i18next.t('validOutpaintMask'));
        throw new Error('Validation failed on outpainting mask inputs');
    }
    if (isEditing && editor === 'outpainting' && (featheringInput < 0 || featheringInput > 50)) {
        alert(i18next.t('validFeathering'));
        throw new Error('Validation failed on featheringInput');
    }
    if (isEditing && editor === 'upscaling' && (isNaN(upscaleMultiplier) || upscaleMultiplier < 1.0 || upscaleMultiplier > 10.0)) {
        alert(i18next.t('validUpscaleMultiplier'));
        throw new Error('Validation failed on upscaleMultiplier');
    }
}
