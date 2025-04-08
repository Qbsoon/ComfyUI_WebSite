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
    var stepsMaxLimit = 140

    if (document.getElementById('modelSelect').value === 'sd_xl_turbo_1.0_fp16.safetensors') {
        stepsMaxLimit = 10
    }

    if (!positivePrompt) {
        alert('Positive Prompt jest wymagany.');
        throw new Error('Validation failed on positivePrompt')
    }

    if (isNaN(cfgInput) || cfgInput < 1.0 || cfgInput > 20.0) {
        alert('CFG musi być liczbą pomiędzy 1.0 a 20.0.');
        throw new Error('Validation failed on cfgInput')
    }

    if (isNaN(stepsInput) || stepsInput < 1 || stepsInput > stepsMaxLimit || !Number.isInteger(stepsInput)) {
        alert('Steps musi być liczbą całkowitą pomiędzy 1 a ' + stepsMaxLimit + '.');
        throw new Error('Validation failed on stepsInput')
    }

    if (isNaN(stepsRefineInput) || stepsRefineInput < 1 || stepsRefineInput > 100 || !Number.isInteger(stepsRefineInput)) {
        alert('Refiner Steps musi być liczbą całkowitą pomiędzy 1 a 100.');
        throw new Error('Validation failed on stepsRefineInput')
    }
}