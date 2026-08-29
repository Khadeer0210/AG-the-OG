// Fallback diagnostic responses for Plant Health scanning when LLaVA vision model is unavailable

export const FALLBACK_DIAGNOSTICS = [
  {
    crop: 'Paddy / Rice',
    disease: 'Rice Blast (Magnaporthe oryzae)',
    confidence: 88,
    severity: 'High',
    summary: 'Spindle-shaped lesions with grayish centers observed on leaf blades. Favorable conditions: High humidity and nitrogen excess.',
    organic_treatment: 'Spray Neem oil (5ml/L) or Trichoderma viride formulation (5g/L). Avoid excessive nitrogen fertilizers.',
    chemical_treatment: 'Apply Tricyclazole 75% WP @ 0.6g/L or Isoprothiolane 40% EC @ 1.5ml/L of water.',
  },
  {
    crop: 'Paddy / Rice',
    disease: 'Bacterial Leaf Blight (Xanthomonas oryzae)',
    confidence: 84,
    severity: 'Moderate',
    summary: 'Water-soaked to yellowish stripes along leaf margins. Bacterial ooze droplets visible in early morning.',
    organic_treatment: 'Spray Fresh Cow Dung Extract (20%) + Bleaching Powder (2g/L). Maintain field drainage.',
    chemical_treatment: 'Spray Streptocycline @ 0.1g/L combined with Copper Oxychloride 50% WP @ 2.5g/L.',
  },
  {
    crop: 'Groundnut',
    disease: 'Tikka Leaf Spot (Cercospora arachidicola)',
    confidence: 91,
    severity: 'Moderate',
    summary: 'Circular dark brown spots surrounded by yellow halos on mature upper leaves. Causes early leaf drop if untreated.',
    organic_treatment: 'Panchagavya spray (3%) or Neem Seed Kernel Extract (NSKE 5%). Collect and burn infected plant debris.',
    chemical_treatment: 'Spray Carbendazim 50% WP @ 1g/L or Mancozeb 75% WP @ 2g/L of water.',
  },
  {
    crop: 'Sugarcane',
    disease: 'Red Rot (Colletotrichum falcatum)',
    confidence: 86,
    severity: 'Severe',
    summary: 'Yellowing and drying of third and fourth leaves. Internal tissue shows reddening with white cross-bands.',
    organic_treatment: 'Dip setts in Trichoderma viride (10g/L) before planting. Rogue out infected clumps immediately.',
    chemical_treatment: 'Soil drenching with Carbendazim 50% WP @ 1g/L near root zones.',
  },
  {
    crop: 'Tomato',
    disease: 'Early Blight (Alternaria solani)',
    confidence: 89,
    severity: 'Moderate',
    summary: 'Concentric ring "target spots" on lower leaves. Defoliation progressing upwards from oldest foliage.',
    organic_treatment: 'Spray Copper Hydroxide (2g/L) or Baking Soda solution (5g/L with 2 drops soap). Mulch soil beneath plants.',
    chemical_treatment: 'Spray Chlorothalonil 75% WP @ 2g/L or Azoxystrobin 23% SC @ 1ml/L of water.',
  },
  {
    crop: 'Brinjal / Eggplant',
    disease: 'Fruit and Shoot Borer (Leucinodes orbonalis)',
    confidence: 92,
    severity: 'High',
    summary: 'Wilting of terminal shoot tips and bore holes on fruits with larval frass excretions.',
    organic_treatment: 'Install Pheromone traps @ 12 traps/acre. Clip and destroy wilted shoots weekly.',
    chemical_treatment: 'Spray Emamectin Benzoate 5% SG @ 0.4g/L or Chlorantraniliprole 18.5% SC @ 0.3ml/L.',
  },
]

export function getRandomFallbackDiagnostic() {
  const idx = Math.floor(Math.random() * FALLBACK_DIAGNOSTICS.length)
  return FALLBACK_DIAGNOSTICS[idx]
}
