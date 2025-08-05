import {i18next} from './main.js';

const queueOutput = document.getElementById('queueOutput');
const comfyQueueOutput = document.getElementById('comfyQueueOutput');
const mainTitle = document.getElementById('mainTitle');
const generatorTab = document.getElementById('generatorTab');
const editorTab = document.getElementById('editorTab');
const galleryTab = document.getElementById('galleryTab');
const publicGalleryTab = document.getElementById('publicGalleryTab');
const helpTab = document.getElementById('helpTab');
const logoutButton = document.getElementById('logoutButton');
const modelSelectLabel = document.getElementById('modelSelectLabel');
const loraSelect = document.getElementById('loraSelect');
const loraStrengthLabel = document.getElementById('loraStrengthLabel');
const modelDefaults = document.getElementById('modelDefaults');
const modelPrompts = document.getElementById('modelPrompts');
const imageLabel = document.getElementById('imageLabel');
const imageInput = document.getElementById('imageInput');
const imageUpload = document.getElementById('imageUpload');
const editorSelectLabel = document.getElementById('editorSelectLabel');
const editorSelect = document.getElementById('editorSelect');
const editorDefaults = document.getElementById('editorDefaults');
const editorPrompts = document.getElementById('editorPrompts');
const positivePromptLabel = document.getElementById('positivePromptLabel');
const negativePromptLabel = document.getElementById('negativePromptLabel');
const systemPromptLabel = document.getElementById('systemPromptLabel');
const stepsLabel = document.getElementById('stepsLabel');
const stepsRefineLabel = document.getElementById('stepsRefineLabel');
const blendLabel = document.getElementById('blendLabel');
const featheringLabel = document.getElementById('featheringLabel');
const leftMaskLabel = document.getElementById('leftMaskLabel');
const topMaskLabel = document.getElementById('topMaskLabel');
const rightMaskLabel = document.getElementById('rightMaskLabel');
const bottomMaskLabel = document.getElementById('bottomMaskLabel');
const widthLabel = document.getElementById('widthLabel');
const heightLabel = document.getElementById('heightLabel');
const ratioOutput = document.getElementById('ratioOutput');
const ratioLabel = document.getElementById('ratioLabel');
const upscaleMultiplierLabel = document.getElementById('upscaleMultiplierLabel');
const submitButton = document.getElementById('submitButton');
const noGeneratedP = document.getElementById('noGeneratedP');
const lastGalleryLabel = document.getElementById('lastGalleryLabel');
const helpTitle = document.getElementById('helpTitle');
const serviceInfo = document.getElementById('serviceInfo');
const serviceInfoP1 = document.getElementById('serviceInfoP1');
const serviceInfoP2 = document.getElementById('serviceInfoP2');
const serviceInfoP3 = document.getElementById('serviceInfoP3');
const serviceInfoP4 = document.getElementById('serviceInfoP4');
const dlworkflow = document.getElementsByClassName('dl-workflow');
const imageGenerationModels = document.getElementById('imageGenerationModels');
const sd35desc = document.getElementById('SD35Desc');
const sdxldesc = document.getElementById('SDXLDesc');
const sdxltdesc = document.getElementById('SDXLTDesc');
const flux1desc = document.getElementById('Flux1Desc');
const fluxKreaDesc = document.getElementById('FluxKreaDesc');
const hdi1fdesc = document.getElementById('HDI1FDesc');
const vv1bdesc = document.getElementById('VV1bDesc');
const lumina2Desc = document.getElementById('Lumina2Desc');
const qwenImgDesc = document.getElementById('qwenImgDesc');
const fluxLoraModels = document.getElementById('fluxLoraModels');
const sourceButton = document.getElementsByClassName('source-btn');
const editorModels = document.getElementById('editorModels');
const colorizingHelp = document.getElementById('colorizingHelp');
const upscaling24help = document.getElementById('upscaling24help');
const dlworkflow4 = document.getElementById('dl-workflow4');
const dlworkflow2 = document.getElementById('dl-workflow2');
const upscalingOtherHelp = document.getElementById('upscalingOtherHelp');
const upscalingOtherDesc = document.getElementById('upscalingOtherDesc');
const outpaintingHelp = document.getElementById('outpaintingHelp');
const outpaintingHelpDesc = document.getElementById('outpaintingHelpDesc');
const supportModels = document.getElementById('supportModels');
const sdxlRefinerDesc = document.getElementById('sdxlRefinerDesc');
const juggernautXLDesc = document.getElementById('juggernautXLDesc');
const terms = document.getElementById('terms');
const ppTerm = document.getElementById('ppTerm');
const npTerm = document.getElementById('npTerm');
const spTerm = document.getElementById('spTerm');
const saTerm = document.getElementById('saTerm');
const scTerm = document.getElementById('scTerm');
const cfTerm = document.getElementById('cfTerm');
const guTerm = document.getElementById('guTerm');
const shTerm = document.getElementById('shTerm');
const stTerm = document.getElementById('stTerm');
const rsTerm = document.getElementById('rsTerm');
const blTerm = document.getElementById('blTerm');
const feTerm = document.getElementById('feTerm');
const maTerm = document.getElementById('maTerm');
const loTerm = document.getElementById('loTerm');

export function updateLocale() {
    document.title = i18next.t('siteTitle');
    if (queueOutput.innerText.includes('queueOutput')) { // On the site load for whatever reason the field contains queueOutput
        queueOutput.innerText = i18next.t('queueOutput') + `${queueOutput.innerText.slice(11, queueOutput.innerText.length)}`;
    }
    if (!queueOutput.innerText.includes(i18next.t('queueOutput'))) {
        if (i18next.language == 'en') {
            queueOutput.innerText = i18next.t('queueOutput') + `${queueOutput.innerText.slice(13, queueOutput.innerText.length)}`;
        } else if (i18next.language == 'pl') {
            queueOutput.innerText = i18next.t('queueOutput') + `${queueOutput.innerText.slice(10, queueOutput.innerText.length)}`;
        }
    }
    if (!comfyQueueOutput.innerText.includes(i18next.t('comfyQueueOutput'))) {
        if (i18next.language == 'en') {
            comfyQueueOutput.innerText = i18next.t('comfyQueueOutput') + `${comfyQueueOutput.innerText.slice(15, comfyQueueOutput.innerText.length)}`;
        } else if (i18next.language == 'pl') {
            comfyQueueOutput.innerText = i18next.t('comfyQueueOutput') + `${comfyQueueOutput.innerText.slice(12, comfyQueueOutput.innerText.length)}`;
        }
    }
    mainTitle.innerText = i18next.t('siteHeader');
    generatorTab.innerText = i18next.t('generatorTab');
    editorTab.innerText = i18next.t('editorTab');
    galleryTab.innerText = i18next.t('galleryTab');
    publicGalleryTab.innerText = i18next.t('publicGalleryTab');
    helpTab.innerText = i18next.t('helpTab');
    logoutButton.innerText = i18next.t('logoutButton');
    modelSelectLabel.innerText = i18next.t('modelSelect');
    loraSelect.options[0].innerText = i18next.t('noLora');
    loraStrengthLabel.innerText = i18next.t('loraStrength');
    modelDefaults.innerText = i18next.t('modelDefaults');
    modelPrompts.innerText = i18next.t('defaultPrompts');
    imageLabel.innerText = i18next.t('imageInput');
    imageInput.placeholder = i18next.t('imageInputPlaceholder');
    imageUpload.innerText = i18next.t('imageUpload');
    editorSelectLabel.innerText = i18next.t('editorSelect');
    editorSelect.options[0].innerText = i18next.t('colorizing');
    editorSelect.options[1].innerText = i18next.t('upscaling');
    editorSelect.options[2].innerText = i18next.t('outpainting');
    editorDefaults.innerText = i18next.t('defaultPrompts');
    editorPrompts.innerText = i18next.t('editorPrompts');
    systemPromptLabel.innerText = i18next.t('systemPrompt');
    positivePromptLabel.innerText = i18next.t('positivePrompt');
    negativePromptLabel.innerText = i18next.t('negativePrompt');
    stepsLabel.innerText = i18next.t('stepsInput');
    stepsRefineLabel.innerText = i18next.t('stepsRefineInput');
    blendLabel.innerText = i18next.t('blendInput');
    featheringLabel.innerText = i18next.t('featheringInput');
    leftMaskLabel.innerText = i18next.t('leftMask');
    topMaskLabel.innerText = i18next.t('topMask');
    rightMaskLabel.innerText = i18next.t('rightMask');
    bottomMaskLabel.innerText = i18next.t('bottomMask');
    widthLabel.innerText = i18next.t('widthInput');
    heightLabel.innerText = i18next.t('heightInput');
    if (ratioOutput.innerText.includes('ratioInput')) { // On the site load for whatever reason the field contains ratioInput
        ratioOutput.innerText = i18next.t('ratioOutput') + `${ratioOutput.innerText.slice(10, ratioOutput.innerText.length)}`;
    }
    if (!ratioOutput.innerText.includes(i18next.t('ratioOutput'))) {
        if (i18next.language == 'en') {
            ratioOutput.innerText = i18next.t('ratioOutput') + `${ratioOutput.innerText.slice(9, ratioOutput.innerText.length)}`;
        } else if (i18next.language == 'pl') {
            ratioOutput.innerText = i18next.t('ratioOutput') + `${ratioOutput.innerText.slice(5, ratioOutput.innerText.length)}`;
        }
    }
    ratioLabel.innerText = i18next.t('ratioInput');
    upscaleMultiplierLabel.innerText = i18next.t('upscaleMultiplier');
    submitButton.innerText = i18next.t('submitButton');
    noGeneratedP.innerText = i18next.t('outputPlaceholder');
    lastGalleryLabel.innerHTML = i18next.t('lastGallery') + ` <button class="refresh-button"><span>&#x21BB;</span></button>`;
    helpTitle.innerText = i18next.t('helpHeader');
    serviceInfo.innerText = i18next.t('helpS1');
    serviceInfoP1.innerText = i18next.t('helpS1P1');
    serviceInfoP2.innerText = i18next.t('helpS1P2');
    serviceInfoP3.innerText = i18next.t('helpS1P3');
    serviceInfoP4.innerHTML = `${i18next.t('helpS1P4')} <a href="mailto:jakubgrula7@gmail.com" target="_blank">jakubgrula7@gmail.com</a>.`;
    for (let i = 0; i < dlworkflow.length; i++) {
        dlworkflow[i].innerText = i18next.t('helpS2T6');
    }
    imageGenerationModels.innerText = i18next.t('helpS2');
    sd35desc.innerText = `${i18next.t('helpS2T1')}: fp8; ${i18next.t('helpS2T2')}: 8.1B; ${i18next.t('helpS2T3')}: 13.9 GB; ${i18next.t('helpS2T4')}: Stability AI; ${i18next.t('helpS2T5')}: ${i18next.t('helpS2T51')}`;
    sdxldesc.innerText = `${i18next.t('helpS2T1')}: fp16; ${i18next.t('helpS2T2')}: 3.5B; ${i18next.t('helpS2T3')}: 6.5 GB; ${i18next.t('helpS2T4')}: Stability AI; ${i18next.t('helpS2T5')}: ${i18next.t('helpS2T52')}`;
    sdxltdesc.innerText = `${i18next.t('helpS2T1')}: fp16; ${i18next.t('helpS2T2')}: 3.5B; ${i18next.t('helpS2T3')}: 6.5 GB; ${i18next.t('helpS2T4')}: Stability AI; ${i18next.t('helpS2T5')}: ${i18next.t('helpS2T53')}`;
    flux1desc.innerText = `${i18next.t('helpS2T1')}: Q8; ${i18next.t('helpS2T2')}: 12B; ${i18next.t('helpS2T3')}: 11.8 GB; ${i18next.t('helpS2T4')}: Black Forest Labs; ${i18next.t('helpS2T5')}: ${i18next.t('helpS2T54')}`;
    fluxKreaDesc.innerText = `${i18next.t('helpS2T1')}: fp8; ${i18next.t('helpS2T2')}: 12B; ${i18next.t('helpS2T3')}: 11.1 GB; ${i18next.t('helpS2T4')}: Black Forest Labs; ${i18next.t('helpS2T5')}: ${i18next.t('helpS2T58')}`;
    hdi1fdesc.innerText = `${i18next.t('helpS2T1')}: fp8; ${i18next.t('helpS2T2')}: 17B; ${i18next.t('helpS2T3')}: 15.9 GB; ${i18next.t('helpS2T4')}: HiDream AI; ${i18next.t('helpS2T5')}: ${i18next.t('helpS2T55')}`;
    vv1bdesc.innerText = `${i18next.t('helpS2T1')}: fp8; ${i18next.t('helpS2T2')}: 12B; ${i18next.t('helpS2T3')}: 11.1 GB; ${i18next.t('helpS2T4')}: SG161222; ${i18next.t('helpS2T5')}: ${i18next.t('helpS2T56')}`;
    lumina2Desc.innerText = `${i18next.t('helpS2T1')}: bfp16; ${i18next.t('helpS2T2')}: 2.6B; ${i18next.t('helpS2T3')}: 9.9 GB; ${i18next.t('helpS2T4')}: Alpha-VLLM; ${i18next.t('helpS2T5')}: ${i18next.t('helpS2T57')}`;
    qwenImgDesc.innerText = `${i18next.t('helpS2T1')}: Q4_K_M; ${i18next.t('helpS2T2')}: 20B; ${i18next.t('helpS2T3')}: 12.1 GB; ${i18next.t('helpS2T4')}: Alibaba Cloud; ${i18next.t('helpS2T5')}: ${i18next.t('helpS2T58')}`;
    fluxLoraModels.innerText = i18next.t('helpS3');
    for (let i = 0; i < sourceButton.length; i++) {
        sourceButton[i].innerText = i18next.t('helpS3T1');
    }
    editorModels.innerText = i18next.t('helpS4');
    colorizingHelp.innerText = i18next.t('helpS41');
    upscaling24help.innerText = i18next.t('helpS42');
    dlworkflow4.innerText = i18next.t('helpS42T1');
    dlworkflow2.innerText = i18next.t('helpS42T2');
    upscalingOtherHelp.innerText = i18next.t('helpS43');
    upscalingOtherDesc.innerText = i18next.t('helpS43Desc');
    outpaintingHelp.innerText = i18next.t('helpS44');
    outpaintingHelpDesc.innerText = i18next.t('helpS44Desc');
    supportModels.innerText = i18next.t('helpS5');
    sdxlRefinerDesc.innerHTML = i18next.t('helpS51P');
    juggernautXLDesc.innerHTML = i18next.t('helpS52P');
    terms.innerText = i18next.t('helpS6');
    ppTerm.innerHTML = `<strong>${i18next.t('helpS61')}:</strong> ${i18next.t('helpS61Desc')}`;
    npTerm.innerHTML = `<strong>${i18next.t('helpS62')}:</strong> ${i18next.t('helpS62Desc')}`;
    spTerm.innerHTML = `<strong>${i18next.t('helpS614')}:</strong> ${i18next.t('helpS614Desc')}`;
    saTerm.innerHTML = `<strong>${i18next.t('helpS63')}:</strong> ${i18next.t('helpS63Desc')}`;
    scTerm.innerHTML = `<strong>${i18next.t('helpS64')}:</strong> ${i18next.t('helpS64Desc')}`;
    cfTerm.innerHTML = `<strong>${i18next.t('helpS65')}:</strong> ${i18next.t('helpS65Desc')}`;
    guTerm.innerHTML = `<strong>${i18next.t('helpS66')}:</strong> ${i18next.t('helpS66Desc')}`;
    shTerm.innerHTML = `<strong>${i18next.t('helpS613')}:</strong> ${i18next.t('helpS613Desc')}`;
    stTerm.innerHTML = `<strong>${i18next.t('helpS67')}:</strong> ${i18next.t('helpS67Desc')}`;
    rsTerm.innerHTML = `<strong>${i18next.t('helpS68')}:</strong> ${i18next.t('helpS68Desc')}`;
    blTerm.innerHTML = `<strong>${i18next.t('helpS69')}:</strong> ${i18next.t('helpS69Desc')}`;
    feTerm.innerHTML = `<strong>${i18next.t('helpS610')}:</strong> ${i18next.t('helpS610Desc')}`;
    maTerm.innerHTML = `<strong>${i18next.t('helpS611')}:</strong> ${i18next.t('helpS611Desc')}`;
    loTerm.innerHTML = `<strong>${i18next.t('helpS612')}:</strong> ${i18next.t('helpS612Desc')}`;
    if (i18next.language == 'en') {
        document.documentElement.lang = 'en';
    } else if (i18next.language == 'pl') {
        document.documentElement.lang = 'pl';
    }
}