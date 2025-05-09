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
    var stepsMaxLimit = 70

    if (document.getElementById('modelSelect').value === 'sd_xl_turbo_1.0_fp16.safetensors') {
        stepsMaxLimit = 10
    }

    if (!positivePrompt) {
        alert('Positive Prompt jest wymagany.');
        throw new Error('Validation failed on positivePrompt')
    }

    if (isNaN(cfgInput) || cfgInput < 1.0 || cfgInput > 10.0) {
        alert('CFG musi być liczbą pomiędzy 1.0 a 10.0.');
        throw new Error('Validation failed on cfgInput')
    }

    if (isNaN(guidanceInput) || guidanceInput < 1.0 || guidanceInput > 10.0) {
        alert('Guidance musi być liczbą pomiędzy 1.0 a 10.0.');
        throw new Error('Validation failed on guidanceInput')
    }

    if (isNaN(stepsInput) || stepsInput < 1 || stepsInput > stepsMaxLimit || !Number.isInteger(stepsInput)) {
        alert('Steps musi być liczbą całkowitą pomiędzy 1 a ' + stepsMaxLimit + '.');
        throw new Error('Validation failed on stepsInput')
    }

    if (isNaN(stepsRefineInput) || stepsRefineInput < 1 || stepsRefineInput+stepsInput > stepsMaxLimit || !Number.isInteger(stepsRefineInput)) {
        alert('Suma Steps i Refiner Steps  musi być liczbą całkowitą pomiędzy 1 a' + stepsMaxLimit +'.');
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
}
