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
	const lora = document.getElementById('loraSelect').value;
	const loraStrength = parseFloat(document.getElementById('loraStrengthInput').value);
	const leftMask = parseInt(document.getElementById('leftMask').value);
	const topMask = parseInt(document.getElementById('topMask').value);
	const rightMask = parseInt(document.getElementById('rightMask').value);
	const bottomMask = parseInt(document.getElementById('bottomMask').value);
	const featheringInput = parseInt(document.getElementById('featheringInput').value);
	const upscaleMultiplier = parseFloat(document.getElementById('upscaleMultiplier').value);

	let workflow;
	const intermediateSteps = Math.ceil(steps/4);

	if (document.getElementById('generatorTab').classList.contains('active')) {
    	if (model === 'sd_xl_base_1.0.safetensors') {
    	    workflow = await loadWorkflow('SDXL.json');
			workflow["8"].inputs.text = promptP;
			workflow["9"].inputs.text = promptN;
			workflow["10"].inputs.width = width;
			workflow["10"].inputs.height = height;
			workflow["11"].inputs.text = promptP;
			workflow["12"].inputs.text = promptN;
			workflow["30"].inputs.steps = stepsRefine+steps;
			workflow["30"].inputs.cfg = cfg;
			workflow["30"].inputs.sampler_name = sampler;
			workflow["30"].inputs.end_at_step = steps;
			workflow["30"].inputs.scheduler = scheduler;
			workflow["30"].inputs.noise_seed = seed;
			workflow["40"].inputs.steps = stepsRefine+steps;
			workflow["40"].inputs.cfg = cfg;
			workflow["40"].inputs.sampler_name = sampler;
			workflow["40"].inputs.start_at_step = steps; 
			workflow["40"].inputs.scheduler = scheduler;
			workflow["98"].inputs.filename_prefix = `${uid}/sdxl`;
		} else if (model === 'sd3.5_large_fp8_scaled.safetensors') {
    	    workflow = await loadWorkflow('SD35.json');
			workflow["8"].inputs.text = promptP;
			workflow["9"].inputs.text = promptN;
			workflow["10"].inputs.width = width;
			workflow["10"].inputs.height = height;
			workflow["30"].inputs.cfg = cfg;
			workflow["30"].inputs.sampler_name = sampler;
			workflow["30"].inputs.steps = steps;
			workflow["30"].inputs.scheduler = scheduler;
			workflow["30"].inputs.seed = seed;
			workflow["98"].inputs.filename_prefix = `${uid}/sd35`;
			if (intermediateSteps > 1) {
				workflow["30"] = {
					"inputs": {
						"add_noise": "enable",
						"noise_seed": seed,
						"steps": steps,
						"cfg": cfg,
						"sampler_name": sampler,
						"scheduler": scheduler,
						"start_at_step": 0,
						"end_at_step": 4,
						"return_with_leftover_noise": "enable",
						"model": ["1",0],
						"positive": ["8",0],
						"negative": ["9",0],
						"latent_image": ["10",0]
					},
					"class_type": "KSamplerAdvanced"
				};
				workflow["50"] = {
					"class_type": "VAEDecode",
					"inputs": {
						"samples": ["30", 0],
						"vae": ["1", 2]
					}
				};
				workflow["70"] = {
					"inputs": {
						"filename": `${uid}/intermediate`,
						"image": ["50",0]
					},
					"class_type": "OverrideImage"
				};
				for (let i = 1; i < intermediateSteps-1; i++) {
					workflow[`${30+i}`] = {
						"inputs": {
							"add_noise": "disable",
							"noise_seed": 0,
							"steps": steps,
							"cfg": cfg,
							"sampler_name": sampler,
							"scheduler": scheduler,
							"start_at_step": i * 4,
							"end_at_step": (i + 1) * 4,
							"return_with_leftover_noise": "enable",
							"model": ["1",0],
							"positive": ["8",0],
							"negative": ["9",0],
							"latent_image": [`${30+i-1}`,0]
						},
						"class_type": "KSamplerAdvanced"
					};
					workflow[`${50+i}`] = {
    				    "class_type": "VAEDecode",
    				    "inputs": {
    				        "samples": [`${30+i}`, 0],
    				        "vae": ["1", 2]
    				    }
    				};
					workflow[`${70+i}`] = {
						"inputs": {
							"filename": `${uid}/intermediate`,
							"image": [`${50+i}`,0]
						},
						"class_type": "OverrideImage"
					};
				}
				workflow[`${30+intermediateSteps-1}`] = {
					"inputs": {
						"add_noise": "disable",
						"noise_seed": 0,
						"steps": steps,
						"cfg": cfg,
						"sampler_name": sampler,
						"scheduler": scheduler,
						"start_at_step": (intermediateSteps - 1) * 4,
						"end_at_step": 1000,
						"return_with_leftover_noise": "disable",
						"model": ["1",0],
						"positive": ["8",0],
						"negative": ["9",0],
						"latent_image": [`${30+intermediateSteps-2}`,0]
					},
					"class_type": "KSamplerAdvanced"
				};
				workflow[`${50+intermediateSteps-1}`] = {
				    "class_type": "VAEDecode",
				    "inputs": {
				        "samples": [`${30+intermediateSteps-1}`, 0],
				        "vae": ["1", 2]
				    }
				};
				workflow['98'].inputs.images = [`${50+intermediateSteps-1}`, 0];
			}
    	} else if (model === 'sd_xl_turbo_1.0_fp16.safetensors') {
    	    workflow = await loadWorkflow('SDXLTurbo.json');
			workflow["8"].inputs.text = promptP;
			workflow["9"].inputs.text = promptN;
			workflow["10"].inputs.width = width;
			workflow["10"].inputs.height = height;
			workflow["11"].inputs.sampler_name = sampler;
			workflow["12"].inputs.steps = steps;
			workflow["98"].inputs.filename_prefix = `${uid}/sdxlturbo`;
    	} else if (model === 'flux1-dev-Q8_0.gguf') {
			workflow = await loadWorkflow('flux.json')
			workflow["8"].inputs.text = promptP;
			workflow["10"].inputs.width = width;
			workflow["10"].inputs.height = height;
			workflow["11"].inputs.noise_seed = seed;
			workflow["12"].inputs.scheduler = scheduler;
			workflow["12"].inputs.steps = steps;
			workflow["13"].inputs.sampler_name = sampler;
			workflow["14"].inputs.guidance = guidance;
			workflow["98"].inputs.filename_prefix = `${uid}/flux`;
			if (lora && lora !== 'none') {
				workflow["4"].inputs.lora_name = lora;
				workflow["4"].inputs.strength_model = loraStrength;
				workflow["4"].inputs.strength_clip = loraStrength;
				workflow["8"].inputs.clip = ["4", 1];
				workflow["12"].inputs.model = ["4", 0];
				workflow["15"].inputs.model = ["4", 0];
			}
			if (lora === 'Textimprover-FLUX-V0.4.safetensors') {
				workflow["8"].inputs.text += ' aidmaTextImprover';
			} else if (lora === 'aidmaDoubleExposure-v0.1.safetensors') {
				workflow["8"].inputs.text += ' Double Exposure';
			} else if (lora === 'aidmaFLUXPro1.1-FLUX-v0.3.safetensors') {
				workflow["8"].inputs.text += ' aidmafluxpro1.1';
			} else if (lora === 'aidmaMJv7-FLUX-v0.1.safetensors') {
				workflow["8"].inputs.text += ' aidmamjv7';
			} else if (lora === 'aidmaPsychadelicChaosWorld-FLUX-v0.1.safetensors') {
				workflow["8"].inputs.text += ' PsychadelicChaos';
			} else if (lora === 'aidmaRealisticSkin-FLUX-v0.1.safetensors') {
				workflow["8"].inputs.text += ' aidmarealisticskin';
			} else if (lora === 'ume_sky_v2.safetensors') {
				workflow["8"].inputs.text += ' umesky';
			} else if (lora === 'ume_modern_pixelart.safetensors') {
				workflow["8"].inputs.text += ' umempart';
			} else if (lora === 'ume_classic_impressionist.safetensors') {
				workflow["8"].inputs.text += ' impressionist';
			}
		} else if (model === 'PixArt-Sigma-XL-2-2K-MS.pth') {
			workflow = await loadWorkflow('pixart.json')
			workflow["8"].inputs.text = promptP;
			workflow["9"].inputs.text = promptN;
			workflow["11"].inputs.ratio = ratio;
			workflow["30"].inputs.steps = steps;
			workflow["30"].inputs.cfg = cfg;
			workflow["30"].inputs.sampler_name = sampler;
			workflow["30"].inputs.scheduler = scheduler;
			workflow["30"].inputs.seed = seed;
			workflow["98"].inputs.filename_prefix = `${uid}/pixart`;
		} else if (model === 'hidream_i1_fast_fp8.safetensors') {
			workflow = await loadWorkflow('HDi1f.json')
			workflow["8"].inputs.text = promptP;
			workflow["9"].inputs.text = promptN;
			workflow["10"].inputs.width = width;
			workflow["10"].inputs.height = height;
			workflow["30"].inputs.sampler_name = sampler;
			workflow["30"].inputs.scheduler = scheduler;
			workflow["30"].inputs.cfg = cfg;
			workflow["30"].inputs.steps = steps;
			workflow["30"].inputs.seed = seed;
			workflow["98"].inputs.filename_prefix = `${uid}/hdi1f`;
		} else if (model === 'VerusVision_1.0b_Transformer_fp8.safetensors') {
			workflow = await loadWorkflow('verusvision.json')
			workflow["8"].inputs.text = promptP;
			workflow["10"].inputs.width = width;
			workflow["10"].inputs.height = height;
			workflow["11"].inputs.sampler_name = sampler;
			workflow["12"].inputs.noise_seed = seed;
			workflow["13"].inputs.scheduler = scheduler;
			workflow["13"].inputs.steps = steps;
			workflow["14"].inputs.guidance = cfg;
			workflow["15"].inputs.cfg = cfg;
			workflow["98"].inputs.filename_prefix = `${uid}/verusvision`;
		}
	} else if (document.getElementById('editorTab').classList.contains('active')) {
		if (editor === 'colorizing') {
			workflow = await loadWorkflow('colorizing.json')
			workflow["4"].inputs.image = `${uid}/${imageInput}`;
			workflow["8"].inputs.text = promptP;
			workflow["9"].inputs.text = promptN;
			workflow["15"].inputs.blend = blendInput;
			workflow["30"].inputs.sampler_name = sampler;
			workflow["30"].inputs.scheduler = scheduler;
			workflow["30"].inputs.cfg = cfg;
			workflow["30"].inputs.steps = steps;
			workflow["30"].inputs.seed = seed;
			workflow["98"].inputs.filename_prefix = `${uid}/colorizing`;

			checkImageResolution(`gallery/${uid}/${imageInput}`).then(resolution => {
				if (resolution.width < 1024 && resolution.height < 1024) {
					delete workflow["11"]
					workflow["10"].inputs.width = resolution.width;
					workflow["10"].inputs.height = resolution.height;
					workflow["12"].inputs.image = ["4", 0];
					workflow["15"].inputs.image_a = ["4", 0];
				}
			}).catch(error => {
				console.error('Error checking image resolution:', error);
			});
		} else if (editor === 'upscaling') {
			if (upscaleMultiplier == 2) {
				workflow = await loadWorkflow('upscaling2.json')
			} else if (upscaleMultiplier == 4) {
				workflow = await loadWorkflow('upscaling4.json')
			} else {
				workflow = await loadWorkflow('upscaling.json')
				workflow["10"].inputs.scale_by = upscaleMultiplier;
			}
			workflow["1"].inputs.image = `${uid}/${imageInput}`;
			workflow["98"].inputs.filename_prefix = `${uid}/upscaling`;
		} else if (editor === 'outpainting') {
			workflow = await loadWorkflow('outpainting.json')
			workflow["4"].inputs.image = `${uid}/${imageInput}`;
			workflow["8"].inputs.text = promptP;
			workflow["10"].inputs.left = leftMask;
			workflow["10"].inputs.top = topMask;
			workflow["10"].inputs.right = rightMask;
			workflow["10"].inputs.bottom = bottomMask;
			workflow["10"].inputs.feathering = featheringInput;
			workflow["12"].inputs.guidance = guidance;
			workflow["30"].inputs.seed = seed;
			workflow["30"].inputs.steps = steps;
			workflow["30"].inputs.sampler_name = sampler;
			workflow["30"].inputs.scheduler = scheduler;
			workflow["98"].inputs.filename_prefix = `${uid}/outpainting`;
		}
	}
	let response = await fetch('/api/prompt-unique-id')
	let uniquePromptId = await response.json();
	workflow["99"]._meta.title = uniquePromptId.unique_id;
	return workflow
}

export { validateInputs };
