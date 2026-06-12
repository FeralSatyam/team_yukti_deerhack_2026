// Static catalog of common medications used to power the medication search
// combobox. Names are kept generic (lowercase brand/INN) and searched with a
// simple case-insensitive substring match, ranked so prefix hits come first.

export const COMMON_MEDICATIONS = [
  "Acetaminophen",
  "Albuterol",
  "Allopurinol",
  "Alprazolam",
  "Amitriptyline",
  "Amlodipine",
  "Amoxicillin",
  "Apixaban",
  "Aspirin",
  "Atenolol",
  "Atorvastatin",
  "Azithromycin",
  "Baclofen",
  "Bisoprolol",
  "Bupropion",
  "Carbamazepine",
  "Carvedilol",
  "Cefuroxime",
  "Celecoxib",
  "Cephalexin",
  "Cetirizine",
  "Ciprofloxacin",
  "Citalopram",
  "Clarithromycin",
  "Clonazepam",
  "Clopidogrel",
  "Codeine",
  "Dabigatran",
  "Dexamethasone",
  "Diazepam",
  "Diclofenac",
  "Digoxin",
  "Diltiazem",
  "Diphenhydramine",
  "Doxycycline",
  "Duloxetine",
  "Enalapril",
  "Escitalopram",
  "Esomeprazole",
  "Fentanyl",
  "Fluconazole",
  "Fluoxetine",
  "Furosemide",
  "Gabapentin",
  "Glimepiride",
  "Hydrochlorothiazide",
  "Hydrocodone",
  "Ibuprofen",
  "Insulin glargine",
  "Ketoconazole",
  "Lamotrigine",
  "Lansoprazole",
  "Levofloxacin",
  "Levothyroxine",
  "Lisinopril",
  "Lithium",
  "Loratadine",
  "Lorazepam",
  "Losartan",
  "Metformin",
  "Methotrexate",
  "Metoprolol",
  "Metronidazole",
  "Montelukast",
  "Morphine",
  "Naproxen",
  "Nifedipine",
  "Nitrofurantoin",
  "Olanzapine",
  "Omeprazole",
  "Ondansetron",
  "Oxycodone",
  "Pantoprazole",
  "Paroxetine",
  "Phenytoin",
  "Prednisone",
  "Pregabalin",
  "Propranolol",
  "Quetiapine",
  "Rivaroxaban",
  "Rosuvastatin",
  "Sertraline",
  "Simvastatin",
  "Spironolactone",
  "Tamsulosin",
  "Tramadol",
  "Trazodone",
  "Valproate",
  "Venlafaxine",
  "Verapamil",
  "Warfarin",
];

/**
 * Case-insensitive search over the medication catalog. Prefix matches are
 * ranked above mid-string matches so the most likely option surfaces first.
 */
export function searchMedications(query) {
  const q = query.trim().toLowerCase();
  if (!q) return COMMON_MEDICATIONS;

  const matches = COMMON_MEDICATIONS.filter((name) =>
    name.toLowerCase().includes(q),
  );

  return matches.sort((a, b) => {
    const aPrefix = a.toLowerCase().startsWith(q) ? 0 : 1;
    const bPrefix = b.toLowerCase().startsWith(q) ? 0 : 1;
    if (aPrefix !== bPrefix) return aPrefix - bPrefix;
    return a.localeCompare(b);
  });
}
