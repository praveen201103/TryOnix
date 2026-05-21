import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const items = [];
const occasionsList = ['casual', 'office', 'wedding', 'party', 'date-night', 'beach', 'workout', 'interview'];
const bodyTypesList = ['slim', 'athletic', 'average', 'curvy', 'plus-size', 'tall', 'petite', 'all'];

const templates = [
  // Outfits
  { name: "Classic Two-Piece Suit", cat: "Outfit", basePrice: 4500, gender: "male" },
  { name: "Summer Floral Dress", cat: "Outfit", basePrice: 2500, gender: "female" },
  { name: "Streetwear Cargo Set", cat: "Outfit", basePrice: 3500, gender: "unisex" },
  { name: "Evening Gown", cat: "Outfit", basePrice: 4500, gender: "female" },
  { name: "Athleisure Matching Set", cat: "Outfit", basePrice: 2000, gender: "unisex" },
  { name: "Tuxedo", cat: "Outfit", basePrice: 5000, gender: "male" },
  // Tops
  { name: "Essential White Tee", cat: "Top", basePrice: 400, gender: "unisex" },
  { name: "Graphic Print Hoodie", cat: "Top", basePrice: 1500, gender: "unisex" },
  { name: "Silk Blouse", cat: "Top", basePrice: 2500, gender: "female" },
  { name: "Denim Jacket", cat: "Top", basePrice: 3000, gender: "unisex" },
  { name: "Chunky Knit Sweater", cat: "Top", basePrice: 2000, gender: "female" },
  { name: "Polo T-Shirt", cat: "Top", basePrice: 800, gender: "male" },
  // Bottoms
  { name: "Classic Blue Jeans", cat: "Jeans", basePrice: 1800, gender: "unisex" },
  { name: "Tailored Trousers", cat: "Bottom", basePrice: 2200, gender: "male" },
  { name: "Pleated Skirt", cat: "Bottom", basePrice: 1200, gender: "female" },
  { name: "Workout Leggings", cat: "Bottom", basePrice: 1000, gender: "female" },
  { name: "Cargo Shorts", cat: "Bottom", basePrice: 800, gender: "male" },
  // Accessories
  { name: "Vintage Baseball Cap", cat: "Cap", basePrice: 400, gender: "unisex" },
  { name: "Classic Aviator Sunglasses", cat: "Accessory", basePrice: 1200, gender: "unisex" },
  { name: "Minimalist Leather Watch", cat: "Accessory", basePrice: 4000, gender: "male" },
  { name: "Silver Pendant Necklace", cat: "Accessory", basePrice: 800, gender: "female" },
  { name: "Canvas Tote Bag", cat: "Accessory", basePrice: 600, gender: "female" }
];

function getRandomItems(arr, count) {
  const shuffled = arr.sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

function getBudget(price) {
  if (price < 500) return 'under-500';
  if (price <= 1000) return '500-1000';
  if (price <= 4000) return '2000-4000';
  return 'above-4000';
}

function stringToColor(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  let color = '';
  for (let i = 0; i < 3; i++) {
    const value = (hash >> (i * 8)) & 0xFF;
    color += ('00' + value.toString(16)).substr(-2);
  }
  return color;
}

for (let i = 1; i <= 200; i++) {
  const t = templates[i % templates.length];
  
  // Create variants
  const colorPrefix = ['Black', 'White', 'Navy', 'Olive', 'Burgundy', 'Grey', 'Beige', 'Pastel', 'Neon'][Math.floor(Math.random() * 9)];
  const name = `${colorPrefix} ${t.name} (V${i})`;
  
  // Distribute prices so we hit all ranges effectively
  const randPriceMult = 0.5 + Math.random() * 1.5; // 0.5x to 2x base price
  let price = Math.round(t.basePrice * randPriceMult);
  
  // Force some to be very cheap or very expensive to populate all brackets
  if (Math.random() < 0.2) price = 300 + Math.floor(Math.random() * 190); // under 500
  else if (Math.random() < 0.2) price = 500 + Math.floor(Math.random() * 500); // 500-1000
  else if (Math.random() < 0.2) price = 2000 + Math.floor(Math.random() * 2000); // 2000-4000
  else if (Math.random() < 0.2) price = 4500 + Math.floor(Math.random() * 5000); // above 4000

  const budget = getBudget(price);
  
  const gender = t.gender;
  const occCount = Math.floor(Math.random() * 3) + 1;
  const occasions = getRandomItems(occasionsList, occCount);
  
  const bodyCount = Math.floor(Math.random() * 4) + 1;
  const bodyTypes = getRandomItems(bodyTypesList, bodyCount);
  
  const pieces = t.cat === "Outfit" ? ["Top", "Bottom", "Shoes"] : [t.cat];
  if (Math.random() > 0.5 && t.cat === "Outfit") pieces.push("Accessory");

  // Every image is uniquely generated via placehold.co so there are NO duplicates
  const bgColor = stringToColor(name + i);
  const imageUrl = `https://placehold.co/400x500/${bgColor}/ffffff?text=${encodeURIComponent(t.cat + '\\n' + colorPrefix)}`;

  items.push({
    id: `item_${i}`,
    name,
    description: `A stylish ${colorPrefix.toLowerCase()} ${t.name.toLowerCase()} perfect for ${occasions[0]} occasions.`,
    price,
    priceRange: budget,
    gender,
    occasions,
    bodyTypes,
    pieces,
    imageUrl,
    category: t.cat
  });
}

const outputPath = path.join(__dirname, 'outfits.json');
fs.writeFileSync(outputPath, JSON.stringify(items, null, 2));
console.log('Successfully generated 200 items without duplicate images to outfits.json');
