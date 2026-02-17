import { createConnection } from 'mysql2/promise';

const conn = await createConnection(process.env.DATABASE_URL);

const blogs = [
  {
    title: "Biang Biang Noodles: The Sound of Handmade Art at Taiwan Maami",
    slug: "biang-biang-noodles-handmade-art-taiwan-maami",
    excerpt: "Discover the centuries-old craft behind Biang Biang noodles — hand-pulled, belt-wide, and deeply satisfying. Learn how Taiwan Maami's Noodle Workshop brings this ancient tradition to life in Chennai.",
    metaTitle: "Biang Biang Noodles in Chennai | Handmade at Taiwan Maami",
    metaDescription: "Experience authentic hand-pulled Biang Biang noodles at Taiwan Maami Chennai. Wide, chewy, and crafted fresh — discover the centuries-old noodle tradition.",
    keywords: "biang biang noodles, handmade noodles Chennai, Taiwan Maami noodles, Taiwanese noodles India, Asian noodles Chennai, noodle workshop Chennai, hand-pulled noodles, wide belt noodles, Chinese noodle tradition, best noodles Chennai",
    content: `## The Meaning Behind "Biang Biang"

In the world of Taiwanese and wider Asian food culture, some dishes transcend the plate — they are performances, rituals, and living traditions. Few dishes embody this spirit more vividly than **Biang Biang noodles**, and at Taiwan Maami's recently launched Noodle Workshop in Chennai, that tradition comes alive every single day.

The name itself holds a clue. "Biang Biang" is an onomatopoeia — it captures the powerful, rhythmic sound of noodle dough being slapped against a wooden table during preparation. That percussive *biang! biang!* resonates through the kitchen as the dough is stretched, pulled, and folded by hand. Before a single bite reaches your mouth, the dish has already announced itself.

The Chinese character for *biáng* is famously one of the most complex in any written language, containing over fifty strokes. It cannot be typed on a standard keyboard and exists almost exclusively in the context of this dish — a fitting symbol for a noodle that defies simplicity.

## Rooted in Centuries of Tradition

Biang Biang noodles trace their origins to **Shaanxi province** in northwestern China, where hand-pulled noodle-making has been practised for centuries. Over generations, Taiwanese cuisine embraced and refined these techniques, blending them with local ingredients and island flavours. The result is a dish that honours its Chinese roots while carrying a distinctly Taiwanese character.

At Taiwan Maami's Noodle Workshop, this heritage is not merely referenced — it is practised. Every batch of noodles is crafted by hand, ensuring the kind of texture and irregularity that no machine can replicate. The workshop represents our commitment to authenticity: real ingredients, real technique, and real flavour.

## A Texture You Can Feel

What sets Biang Biang noodles apart is their distinctive **belt-like shape** — wide, flat, and satisfyingly chewy. Each noodle is thick enough to hold its own against bold sauces, yet tender enough to yield with every bite. The hand-pulled process creates subtle variations in thickness that give each strand its own character, absorbing sauces in a way that uniform, machine-cut noodles simply cannot match.

This is not a dish you merely eat. You experience it — the resistance of the dough against your teeth, the way chilli oil pools in the folds, the interplay of heat, spice, and wheat.

## The Complete Taiwan Maami Experience

At Taiwan Maami, authenticity means honouring tradition while delivering quality that speaks for itself. From our signature **ChickGozilla** — the iconic XXL fried chicken steak that has become a Chennai favourite — to our handmade Biang Biang noodles, every dish on our menu celebrates the diversity and depth of Taiwanese cuisine.

For the complete experience, pair your Biang Biang noodles with a ChickGozilla and one of our freshly crafted bubble teas. It is a combination that captures everything we love about Taiwanese food culture — bold flavours, generous portions, and the kind of care that turns a meal into a memory.

---

*Visit Taiwan Maami to taste handmade Biang Biang noodles crafted fresh daily. Available at our T. Nagar outlet in Chennai.*`
  },
  {
    title: "Discover Authentic Taiwanese Food: From Night Markets to Your Table",
    slug: "discover-authentic-taiwanese-food-night-markets-to-table",
    excerpt: "Taiwanese cuisine is shaped by centuries of Chinese culinary tradition, Japanese refinement, and vibrant street food culture. Explore the iconic dishes that define Taiwan — and where to find them in Chennai.",
    metaTitle: "Authentic Taiwanese Food in Chennai | Taiwan Maami Guide",
    metaDescription: "Explore iconic Taiwanese dishes — beef noodle soup, braised pork rice, XXL fried chicken & bubble tea. Taste authentic Taiwanese food at Taiwan Maami Chennai.",
    keywords: "Taiwanese food Chennai, authentic Taiwanese cuisine, Taiwanese restaurant India, beef noodle soup, braised pork rice, lu rou fan, oyster omelette, Taiwanese fried chicken, bubble tea Chennai, Asian food Chennai, night market food India, Taiwan Maami menu, best Asian restaurant Chennai",
    content: `## The Cultural Roots of Taiwanese Cuisine

When you explore Taiwanese food, you discover a cuisine shaped by history, migration, and relentless creativity. Its foundations lie deep in the culinary traditions of **southern China**, particularly Fujian province, where slow braising, soy-based sauces, and meticulous seasoning form the backbone of everyday cooking. During the Japanese colonial era, Taiwan's food culture absorbed lighter textures, refined frying techniques, and an emphasis on aesthetic presentation that persists to this day.

The result is a cuisine that feels simultaneously traditional and modern — bold yet comforting, rustic yet refined. At Taiwan Maami, we bring that layered authenticity to Chennai, one dish at a time.

## Iconic Taiwanese Dishes You Should Know

If you are new to Taiwanese food, these are the dishes that define the cuisine and have earned it a devoted following across the world.

### Beef Noodle Soup (Niurou Mian)

Often regarded as Taiwan's national dish, beef noodle soup features slow-braised beef simmered for hours in a rich, aromatic broth with star anise, soy, and chilli. The tender meat, springy noodles, and deeply flavoured liquid represent the very best of Chinese braising traditions, refined through generations of Taiwanese home cooks and night market vendors.

### Braised Pork Rice (Lu Rou Fan)

Arguably the most beloved comfort food on the island, *lu rou fan* is deceptively simple: finely minced pork belly braised in soy sauce, rice wine, and five-spice, ladled over a bowl of steaming white rice. Every family in Taiwan has their own version, and every version is worth trying.

### Oyster Omelette

A night market staple found at virtually every *yè shì* across Taiwan, the oyster omelette combines plump fresh oysters with egg and a slightly chewy sweet potato starch batter, finished with a tangy-sweet sauce. It is messy, unpretentious, and utterly addictive.

### Scallion Pancake (Cong You Bing)

Crispy on the outside, soft and layered within, the scallion pancake showcases the beauty of Chinese dough-working techniques. Each pancake is rolled, folded, and pan-fried to create dozens of flaky layers studded with fragrant spring onion.

### Taiwanese Fried Chicken Steak (Ji Pai)

The undisputed star of Taiwan's night markets — an enormous, crispy, heavily seasoned chicken cutlet served in a paper bag. At Taiwan Maami, we serve our signature version called **ChickGozilla**: an XXL fried chicken steak that is golden, juicy, and tender throughout. Unlike typical fried chicken that can turn dry and tough, ChickGozilla is marinated to lock in moisture before being coated and fried using traditional Taiwanese street food techniques.

## The Iconic Pairing: Fried Chicken and Bubble Tea

No exploration of Taiwanese food is complete without understanding the pairing that defines Taiwan's street food identity: **crispy fried chicken with cold, creamy bubble tea**. The crunch of seasoned chicken balanced against the refreshing sweetness of milk tea and chewy tapioca pearls creates a contrast of textures and temperatures that is as satisfying as it is iconic.

At Taiwan Maami in Chennai, this pairing is not a novelty — it is a tradition we honour every day.

## Authenticity at Taiwan Maami

From the handmade elements in our Biang Biang noodles to the carefully marinated ChickGozilla, every dish at Taiwan Maami reflects a commitment to genuine Taiwanese flavour. We do not simply serve Asian food — we serve heritage, craftsmanship, and the culinary art of an island that has spent centuries perfecting the balance between comfort and boldness.

If you are searching for authentic Taiwanese food in Chennai — food that respects its Chinese roots, embraces its Japanese influences, and celebrates the vibrant energy of Asia's greatest food culture — Taiwan Maami is your destination.

---

*Come taste Taiwan. Come experience authenticity. Visit Taiwan Maami at T. Nagar, Chennai.*`
  },
  {
    title: "Meet ChickGozilla: The XXL Fried Chicken Steak You Cannot Ignore",
    slug: "chickgozilla-xxl-fried-chicken-steak-taiwan-maami",
    excerpt: "ChickGozilla is Taiwan Maami's signature XXL fried chicken steak — crispy, golden, and impossibly juicy. Discover the Taiwanese night market tradition behind Chennai's most talked-about chicken.",
    metaTitle: "ChickGozilla XXL Fried Chicken | Taiwan Maami Chennai",
    metaDescription: "Try ChickGozilla — Taiwan Maami's XXL fried chicken steak. Crispy, juicy & inspired by Taiwanese night markets. Best fried chicken in Chennai. Order now!",
    keywords: "ChickGozilla, XXL fried chicken Chennai, Taiwanese fried chicken steak, best fried chicken Chennai, Taiwan Maami chicken, fried chicken bubble tea, night market fried chicken India, crispy chicken steak Chennai, Asian fried chicken, Taiwanese street food Chennai",
    content: `## What Is ChickGozilla?

If you have never tried a Taiwanese fried chicken steak, nothing quite prepares you for the first encounter. At Taiwan Maami, we proudly present **ChickGozilla** — our signature chicken steak in XXL size that has become one of the most talked-about dishes in Chennai's food scene.

ChickGozilla is not merely large. It is a statement. Golden, crispy, and impressively broad, each piece begins with a whole chicken breast that is pounded thin, marinated in a proprietary blend of Taiwanese spices, and coated in a light, shatteringly crisp batter. But what truly sets ChickGozilla apart from ordinary fried chicken is what happens when you bite through that crust: the meat inside is **tender, juicy, and deeply seasoned** throughout.

This is not the kind of fried chicken that dries out and becomes difficult to swallow after the first few bites. Every piece is marinated for hours, allowing the flavour to penetrate to the centre and locking in moisture before the chicken ever touches hot oil.

## The Night Market Tradition

Taiwan is famous for its **night markets** — sprawling, neon-lit streets lined with hundreds of food stalls, each specialising in a single dish perfected over decades. Among the most iconic sights at any Taiwanese night market is the oversized fried chicken steak, known locally as *jī pái* (雞排). Vendors press enormous cutlets flat, season them with five-spice and white pepper, and fry them to order in enormous woks of bubbling oil. The aroma alone draws queues that stretch around the block.

At Taiwan Maami, we recreate that authentic street food experience in Chennai. The technique is the same: hand-pounded, carefully seasoned, fried at precisely the right temperature to achieve maximum crispness without sacrificing a drop of moisture. The result is a chicken steak that is faithful to its Taiwanese origins while being crafted fresh for every customer who walks through our door.

## The Perfect Pairing: Fried Chicken with Bubble Tea

There is one combination that defines Taiwanese food culture more than any other: **fried chicken with bubble tea**. The contrast is what makes it work — the salty, crunchy, savoury intensity of the chicken against the cool, creamy sweetness of milk tea with chewy tapioca pearls. It is a pairing that has been perfected over decades in Taiwan's night markets, and it translates beautifully to every table at Taiwan Maami.

Whether you choose a classic Brown Sugar Pearl Milk Tea, a Tiramisu Oolong Latte, or a refreshing fruit tea, the combination with ChickGozilla elevates both the drink and the dish. It is not just a meal — it is the authentic Taiwanese street food experience, available right here in Chennai.

## Why Chennai Loves ChickGozilla

Since its introduction, ChickGozilla has earned a devoted following among Chennai's food enthusiasts. The reasons are straightforward: it delivers on every promise. The size is genuinely impressive. The crunch is audible. The seasoning is bold without being overwhelming. And the meat stays juicy from the first bite to the last.

If you love big flavours, bold bites, and authentic Taiwanese food crafted with care, ChickGozilla is waiting for you at Taiwan Maami.

---

*Order ChickGozilla at Taiwan Maami, T. Nagar, Chennai. Available for dine-in, pickup, and delivery.*`
  }
];

for (const blog of blogs) {
  const [result] = await conn.execute(
    'INSERT INTO blog_articles (title, slug, excerpt, content, metaTitle, metaDescription, keywords, authorName, status, publishedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())',
    [blog.title, blog.slug, blog.excerpt, blog.content, blog.metaTitle, blog.metaDescription, blog.keywords, 'Taiwan Maami', 'published']
  );
  console.log(`Inserted: "${blog.title}" (id: ${result.insertId})`);
}

console.log("\nAll 3 blogs inserted successfully!");
await conn.end();
process.exit(0);
