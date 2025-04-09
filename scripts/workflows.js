import { sanitizeInput, validateInputs} from './validateSanitize.js?cache-bust=1';

async function loadWorkflow(file) {
    try {
        const response = await fetch(`workflows/${file}`);
        if (!response.ok) {
            throw new Error(`Failed to load workflow JSON: ${response.statusText}`);
        }
        const workflow = await response.json();
		// Wspólne ustawienia workflow
		workflow["6"].inputs.text = sanitizeInput(document.getElementById('positivePrompt').value.trim());
		workflow["7"].inputs.text = sanitizeInput(document.getElementById('negativePrompt').value.trim());
        return workflow;
    } catch (error) {
        console.error('Error loading workflow JSON:', error);
    }
}

export async function setWorkflow() {
	const promptP = sanitizeInput(document.getElementById('positivePrompt').value.trim());
	const promptN = sanitizeInput(document.getElementById('negativePrompt').value.trim());
    const cfg = parseFloat(document.getElementById('cfgInput').value);
    const steps = parseInt(document.getElementById('stepsInput').value);
    const stepsRefine = parseInt(document.getElementById('stepsRefineInput').value);
    const sampler = document.getElementById('samplerSelect').value;
	const scheduler = document.getElementById('schedulerSelect').value;
    const uid = 0

	let workflow;

    if (document.getElementById('modelSelect').value === 'sd_xl_base_1.0.safetensors') {
        workflow = await loadWorkflow('SDXL.json');
		workflow["10"].inputs.steps = stepsRefine+steps;
		workflow["10"].inputs.cfg = cfg;
		workflow["10"].inputs.sampler_name = sampler;
		workflow["10"].inputs.end_at_step = steps;
		workflow["10"].inputs.scheduler = scheduler;
		workflow["11"].inputs.steps = stepsRefine+steps;
		workflow["11"].inputs.cfg = cfg;
		workflow["11"].inputs.sampler_name = sampler;
		workflow["11"].inputs.start_at_step = steps;
		workflow["11"].inputs.scheduler = scheduler;
		workflow["15"].inputs.text = promptP;
		workflow["16"].inputs.text = promptN;
		workflow["19"].inputs.filename_prefix = `${uid}\\sdxl`;
	} else if (document.getElementById('modelSelect').value === 'sd3.5_large_fp8_scaled.safetensors') {
        workflow = await loadWorkflow('SD35.json');
		workflow["3"].inputs.cfg = cfg;
		workflow["3"].inputs.sampler_name = sampler;
		workflow["3"].inputs.steps = steps;
		workflow["3"].inputs.scheduler = scheduler;
		workflow["9"].inputs.filename_prefix = `${uid}\\sd35`;
    } else if (document.getElementById('modelSelect').value === 'sd_xl_turbo_1.0_fp16.safetensors') {
        workflow = await loadWorkflow('SDXLTurbo.json');
		workflow["13"].inputs.cfg = cfg;
		workflow["14"].inputs.sampler_name = sampler;
		workflow["22"].inputs.steps = steps;
		workflow["19"].inputs.filename_prefix = `${uid}\\sdxlturbo`;
    }
	return workflow
}

export { validateInputs };