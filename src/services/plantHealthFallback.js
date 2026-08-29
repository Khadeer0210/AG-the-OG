// ═══════════════════════════════════════════════════════
// AGRI VISION — Plant Health Fallback Dataset
// Used when LLaVA vision model is unavailable
// ═══════════════════════════════════════════════════════

const FALLBACK_CONDITIONS = [
  {
    crop: 'Rice (Paddy)',
    disease: 'Leaf Blast',
    confidence: 72,
    severity: 'Moderate',
    summary: 'Diamond-shaped lesions with grey centers observed on leaves. Common in humid conditions with temperatures 20-28°C.',
    organic_treatment: 'Apply Pseudomonas fluorescens @ 5g/L as foliar spray. Use neem oil 3% spray. Maintain proper spacing.',
    chemical_treatment: 'Spray Tricyclazole 75WP @ 0.6g/L or Isoprothiolane 40EC @ 1.5ml/L at 15-day intervals.',
  },
  {
    crop: 'Tomato',
    disease: 'Early Blight',
    confidence: 68,
    severity: 'Moderate',
    summary: 'Concentric ring pattern (target board) lesions on lower leaves. Caused by Alternaria solani, common during warm humid weather.',
    organic_treatment: 'Apply Trichoderma viride @ 4g/L. Remove infected leaves. Mulch to prevent soil splash.',
    chemical_treatment: 'Spray Mancozeb 75WP @ 2.5g/L or Chlorothalonil 75WP @ 2g/L at 10-day intervals.',
  },
  {
    crop: 'Groundnut',
    disease: 'Tikka Disease (Leaf Spot)',
    confidence: 70,
    severity: 'Low',
    summary: 'Small dark brown circular spots on leaves. Caused by Cercospora arachidicola. Yield loss 10-50% if untreated.',
    organic_treatment: 'Spray neem kernel extract 5%. Practice crop rotation. Remove and destroy infected debris.',
    chemical_treatment: 'Apply Carbendazim 50WP @ 1g/L or Hexaconazole 5EC @ 2ml/L.',
  },
  {
    crop: 'Brinjal (Eggplant)',
    disease: 'Shoot and Fruit Borer',
    confidence: 75,
    severity: 'High',
    summary: 'Borer larvae inside shoots and fruits causing wilting and fruit damage. Major pest in brinjal cultivation across India.',
    organic_treatment: 'Install pheromone traps @ 5/acre. Spray Bt (Bacillus thuringiensis) @ 2g/L. Remove infested shoots.',
    chemical_treatment: 'Spray Emamectin Benzoate 5SG @ 0.4g/L or Spinosad 45SC @ 0.3ml/L.',
  },
  {
    crop: 'Cotton',
    disease: 'Leaf Curl Virus',
    confidence: 65,
    severity: 'Severe',
    summary: 'Upward curling of leaves with thickened veins. Transmitted by whitefly (Bemisia tabaci). Causes significant yield reduction.',
    organic_treatment: 'Use yellow sticky traps for whitefly. Spray neem oil 2%. Remove and destroy infected plants early.',
    chemical_treatment: 'Control whitefly vector with Thiamethoxam 25WG @ 0.3g/L or Diafenthiuron 50WP @ 1g/L.',
  },
  {
    crop: 'Wheat',
    disease: 'Rust (Yellow/Brown)',
    confidence: 71,
    severity: 'Moderate',
    summary: 'Orange-brown pustules on leaves and stems. Stripe/yellow rust appears as stripes; leaf rust as scattered pustules.',
    organic_treatment: 'Use resistant varieties. Apply Trichoderma harzianum as seed treatment. Balanced NPK nutrition.',
    chemical_treatment: 'Spray Propiconazole 25EC @ 1ml/L or Tebuconazole 25.9EC @ 1ml/L at first appearance.',
  },
  {
    crop: 'Unknown',
    disease: 'None',
    confidence: 55,
    severity: 'Low',
    summary: 'Plant appears generally healthy. No significant disease symptoms detected. Monitor regularly for any changes.',
    organic_treatment: 'Continue preventive sprays with neem oil. Maintain proper nutrition and irrigation schedule.',
    chemical_treatment: 'No treatment needed. Apply preventive fungicide if weather conditions favor disease development.',
  },
]

/**
 * Get a fallback plant health result when LLaVA is unavailable
 * Returns a plausible result clearly marked as fallback
 */
export function getFallbackResult() {
  const idx = Math.floor(Math.random() * FALLBACK_CONDITIONS.length)
  return {
    ...FALLBACK_CONDITIONS[idx],
    ai_generated: false,
    fallback: true,
    source: 'fallback_dataset',
    disclaimer: 'This is a reference result generated from common conditions. For accurate diagnosis, please ensure the AI Vision model is running.',
  }
}

/**
 * Get a contextual fallback based on crop name
 */
export function getFallbackForCrop(cropName) {
  const match = FALLBACK_CONDITIONS.find(c =>
    cropName && c.crop.toLowerCase().includes(cropName.toLowerCase())
  )
  if (match) {
    return { ...match, ai_generated: false, fallback: true, source: 'fallback_dataset' }
  }
  return getFallbackResult()
}
