import { sanitizeInput, validateInputs} from './validateSanitize.js?cache-bust=1';

async function loadWorkflow(file) {
    try {
        const response = await fetch(`workflows/${file}`);
        if (!response.ok) {
            throw new Error(`Failed to load workflow JSON: ${response.statusText}`);
        }
        const workflow = await response.json();
        return workflow;
    } catch (error) {
        console.error('Error loading workflow JSON:', error);
    }
}

function checkImageResolution(imagePath) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = imagePath;
    });
}

export async function setWorkflow(uid) {
	const promptP = sanitizeInput(document.getElementById('positivePrompt').value.trim());
	const promptN = sanitizeInput(document.getElementById('negativePrompt').value.trim());
    const cfg = parseFloat(document.getElementById('cfgInput').value);
    const steps = parseInt(document.getElementById('stepsInput').value);
    const stepsRefine = parseInt(document.getElementById('stepsRefineInput').value);
    const sampler = document.getElementById('samplerSelect').value;
	const scheduler = document.getElementById('schedulerSelect').value;
	const guidance = parseFloat(document.getElementById('guidanceInput').value);
	const width = parseInt(document.getElementById('widthInput').value);
	const height = parseInt(document.getElementById('heightInput').value);
	const ratio = document.getElementById('ratioInput').value;
	const blendInput = parseFloat(document.getElementById('blendInput').value);
	const imageInput = document.getElementById('imageInput').value;
	const seed = Math.floor(Math.random() * 999999999999999)
	const model = document.getElementById('modelSelect').value;
	const editor = document.getElementById('editorSelect').value;

	let workflow;

	if (document.getElementById('generatorTab').classList.contains('active')) {
    	if (model === 'sd_xl_base_1.0.safetensors') {
    	    workflow = await loadWorkflow('SDXL.json');
			workflow["5"].inputs.width = width;
			workflow["5"].inputs.height = height;
			workflow["6"].inputs.text = promptP;
			workflow["7"].inputs.text = promptN;
			workflow["10"].inputs.steps = stepsRefine+steps;
			workflow["10"].inputs.cfg = cfg;
			workflow["10"].inputs.sampler_name = sampler;
			workflow["10"].inputs.end_at_step = steps;
			workflow["10"].inputs.scheduler = scheduler;
			workflow["10"].inputs.noise_seed = seed;
			workflow["11"].inputs.steps = stepsRefine+steps;
			workflow["11"].inputs.cfg = cfg;
			workflow["11"].inputs.sampler_name = sampler;
			workflow["11"].inputs.start_at_step = steps; 
			workflow["11"].inputs.scheduler = scheduler;
			workflow["15"].inputs.text = promptP;
			workflow["16"].inputs.text = promptN;
			workflow["19"].inputs.filename_prefix = `${uid}/sdxl`;
		} else if (model === 'sd3.5_large_fp8_scaled.safetensors') {
    	    workflow = await loadWorkflow('SD35.json');
			workflow["3"].inputs.cfg = cfg;
			workflow["3"].inputs.sampler_name = sampler;
			workflow["3"].inputs.steps = steps;
			workflow["3"].inputs.scheduler = scheduler;
			workflow["3"].inputs.seed = seed;
			workflow["5"].inputs.width = width;
			workflow["5"].inputs.height = height;
			workflow["6"].inputs.text = promptP;
			workflow["7"].inputs.text = promptN;
			workflow["9"].inputs.filename_prefix = `${uid}/sd35`;
    	} else if (model === 'sd_xl_turbo_1.0_fp16.safetensors') {
    	    workflow = await loadWorkflow('SDXLTurbo.json');
			workflow["5"].inputs.width = width;
			workflow["5"].inputs.height = height;
			workflow["6"].inputs.text = promptP;
			workflow["7"].inputs.text = promptN;
			workflow["14"].inputs.sampler_name = sampler;
			workflow["22"].inputs.steps = steps;
			workflow["19"].inputs.filename_prefix = `${uid}/sdxlturbo`;
    	} else if (model === 'flux1-dev-Q8_0.gguf') {
			workflow = await loadWorkflow('flux.json')
			workflow["9"].inputs.guidance = guidance;
			workflow["11"].inputs.text = promptP;
			workflow["12"].inputs.width = width;
			workflow["12"].inputs.height = height;
			workflow["13"].inputs.noise_seed = seed;
			workflow["14"].inputs.sampler_name = sampler;
			workflow["15"].inputs.scheduler = scheduler;
			workflow["15"].inputs.steps = steps;
			workflow["18"].inputs.filename_prefix = `${uid}/flux`;
		} else if (model === 'PixArt-Sigma-XL-2-2K-MS.pth') {
			workflow = await loadWorkflow('pixart.json')
			workflow["2"].inputs.ratio = ratio;
			workflow["4"].inputs.steps = steps;
			workflow["4"].inputs.cfg = cfg;
			workflow["4"].inputs.sampler_name = sampler;
			workflow["4"].inputs.scheduler = scheduler;
			workflow["4"].inputs.seed = seed;
			workflow["5"].inputs.text = promptP;
			workflow["6"].inputs.text = promptN;
			workflow["10"].inputs.filename_prefix = `${uid}/pixart`;
		} else if (model === 'hidream_i1_fast_fp8.safetensors') {
			workflow = await loadWorkflow('HDi1f.json')
			workflow["3"].inputs.sampler_name = sampler;
			workflow["3"].inputs.scheduler = scheduler;
			workflow["3"].inputs.cfg = cfg;
			workflow["3"].inputs.steps = steps;
			workflow["3"].inputs.seed = seed;
			workflow["16"].inputs.text = promptP;
			workflow["40"].inputs.text = promptN;
			workflow["53"].inputs.width = width;
			workflow["53"].inputs.height = height;
			workflow["9"].inputs.filename_prefix = `${uid}/hdi1f`;
		} else if (model === 'VerusVision_1.0b_Transformer_fp8.safetensors') {
			workflow = await loadWorkflow('verusvision.json')
			workflow["6"].inputs.text = promptP;
			workflow["16"].inputs.sampler_name = sampler;
			workflow["17"].inputs.scheduler = scheduler;
			workflow["17"].inputs.steps = steps;
			workflow["25"].inputs.noise_seed = seed;
			workflow["39"].inputs.width = width;
			workflow["39"].inputs.height = height;
			workflow["40"].inputs.cfg = cfg;
			workflow["26"].inputs.guidance = cfg;
			workflow["9"].inputs.filename_prefix = `${uid}/verusvision`;
		}
	} else if (document.getElementById('editorTab').classList.contains('active')) {
		if (editor === 'colorizing') {
			workflow = await loadWorkflow('colorizing.json')
			workflow["2"].inputs.sampler_name = sampler;
			workflow["2"].inputs.scheduler = scheduler;
			workflow["2"].inputs.cfg = cfg;
			workflow["2"].inputs.steps = steps;
			workflow["2"].inputs.seed = seed;
			workflow["3"].inputs.text = promptP;
			workflow["4"].inputs.text = promptN;
			workflow["161"].inputs.blend = blendInput;
			workflow["174"].inputs.image = `${uid}/${imageInput}`;
			workflow["186"].inputs.filename_prefix = `${uid}/colorizing`;

			checkImageResolution(`gallery/${uid}/${imageInput}`).then(resolution => {
				if (resolution.width < 1024 && resolution.height < 1024) {
					delete workflow["101"]
					workflow["148"].inputs.image = ["174", 0];
					workflow["161"].inputs.image_a = ["174", 0];
					workflow["22"].inputs.width = resolution.width;
					workflow["22"].inputs.height = resolution.height;
				}
			}).catch(error => {
				console.error('Error checking image resolution:', error);
			});
		} else if (editor === 'upscaling') {
			workflow = await loadWorkflow('upscaling.json')
			workflow["1"].inputs.image = `${uid}/${imageInput}`;
			workflow["6"].inputs.filename_prefix = `${uid}/upscaling`;
		}
	}
	let response = await fetch('/api/prompt-unique-id')
	let uniquePromptId = await response.json();
	workflow["99"]._meta.title = uniquePromptId.unique_id;
	return workflow
}

export { validateInputs };
