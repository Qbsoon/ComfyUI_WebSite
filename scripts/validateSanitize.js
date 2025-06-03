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

    if (isEditing && editor === 'upscaling') {
        if (fn.startsWith("upscaling")) {
            alert('Nie można upscale\'ować obrazu, który już jest wynikiem upscale\'owania.')
            throw new Error('Validation failed on imageInput for upscaling');
        } else {
            return true;
        }
    }

    if (model === 'sd_xl_turbo_1.0_fp16.safetensors') {
        stepsMaxLimit = 10;
    }

    if (isEditing && editor === 'outpainting') {
        guidanceMaxLimit = 50.0;
    }

    if (!positivePrompt) {
        alert('Positive Prompt jest wymagany.');
        throw new Error('Validation failed on positivePrompt')
    }

    if (isNaN(cfgInput) || cfgInput < 1.0 || cfgInput > 10.0) {
        alert('CFG musi być liczbą pomiędzy 1.0 a 10.0.');
        throw new Error('Validation failed on cfgInput')
    }

    if (isNaN(guidanceInput) || guidanceInput < 1.0 || guidanceInput > guidanceMaxLimit) {
        alert('Guidance musi być liczbą pomiędzy 1.0 a ' + guidanceMaxLimit + '.');
        throw new Error('Validation failed on guidanceInput')
    }

    if (isNaN(stepsInput) || stepsInput < 1 || stepsInput > stepsMaxLimit || !Number.isInteger(stepsInput)) {
        alert('Steps musi być liczbą całkowitą pomiędzy 1 a ' + stepsMaxLimit + '.');
        throw new Error('Validation failed on stepsInput')
    }

    if (model === 'sd_xl_base_1.0.safetensors' && (isNaN(stepsRefineInput) || stepsRefineInput < 1 || stepsRefineInput+stepsInput > stepsMaxLimit || !Number.isInteger(stepsRefineInput))) {
        alert('Suma Steps i Refiner Steps musi być liczbą całkowitą pomiędzy 1 a' + stepsMaxLimit +'.');
        throw new Error('Validation failed on stepsRefineInput')
    }

    if (isNaN(widthInput) || widthInput < 64 || widthInput > 2048 || !Number.isInteger(widthInput)) {
        alert('Width musi być liczbą całkowitą pomiędzy 64 a 2048.');
        throw new Error('Validation failed on widthInput')
    }
    if (isNaN(heightInput) || heightInput < 64 || heightInput > 2048 || !Number.isInteger(heightInput)) {
        alert('Height musi być liczbą całkowitą pomiędzy 64 a 2048.');
        throw new Error('Validation failed on heightInput')
    }
    if (isNaN(ratioInput) || ratioInput < 0.25 || ratioInput > 4.0) {
        alert('Ratio musi być liczbą pomiędzy 0.25 a 4.0.');
        throw new Error('Validation failed on ratioInput')
    }
    if (editor === 'colorizing' && (isNaN(blendInput) || blendInput < 0.0 || blendInput > 1.0)) {
        alert('Blend musi być liczbą pomiędzy 0.0 a 1.0.');
        throw new Error('Validation failed on blendInput')
    }
    if (!isEditing && model === 'flux1-dev-Q8_0.gguf' && lora !== 'none' && (isNaN(loraStrength) || loraStrength < -1.0 || loraStrength > 2.0)) {
        alert('LoRA Strength musi być liczbą pomiędzy -1.0 a 2.0.');
        throw new Error('Validation failed on loraStrengthInput')
    }
    if (isEditing && editor === 'outpainting' && ((leftMask < 0 || leftMask > 1024) || (topMask < 0 || topMask > 1024) || (rightMask < 0 || rightMask > 1024) || (bottomMask < 0 || bottomMask > 1024))) {
        alert('Maski rozszerzenia muszą być liczbami całkowitymi pomiędzy 0 a 1024.');
        throw new Error('Validation failed on outpainting mask inputs');
    }
    if (isEditing && editor === 'outpainting' && (featheringInput < 0 || featheringInput > 50)) {
        alert('Feathering musi być liczbą całkowitą pomiędzy 0 a 50.');
        throw new Error('Validation failed on featheringInput');
    }
}
