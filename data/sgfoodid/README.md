# Singapore dishes from SG FoodID

Plateful's Singapore food list is built from CSV files exported from the Health Promotion Board's
[Singapore Food Insights Database (SG FoodID)](https://pphtpc.hpb.gov.sg/web/sgfoodid/tools/food-search).
Its [terms](https://go.gov.sg/termsofuse-hpbsgfoodid) let you copy and redistribute the data, as long as the app shows a
visible credit (Plateful shows it in More → About and on each Singapore food) and doesn't suggest that HPB endorses it.

The site asks automated tools not to crawl it (`robots.txt`). The 113 dishes here are a one-off starter set the owner asked for on
7 Nov 2026: each was fetched with the same search and details requests the SG FoodID page makes, one request every 2 seconds, and
saved in the single-food export layout. Add further dishes by hand export as below rather than by script.

## Add dishes

1. Search a dish on [SG FoodID food search](https://pphtpc.hpb.gov.sg/web/sgfoodid/tools/food-search), open it, and press **Export as CSV**.
2. Save the downloaded `.csv` file into this folder (`data/sgfoodid/`). Keep SG FoodID's file name, because it ends with the export date that the credit needs.
3. Run `npm run sgfoods`. It writes `public/sg-foods.json` and lists any file it couldn't read.
4. Commit and push, and the site updates by itself.

Using the comparison list's export instead (up to 10 dishes per file)? Its layout differs from the single-food export, so send the
first file over and the importer will be extended to read it.

## Starter checklist (popular dishes)

Use these as search words. Pick the closest match, usually the plain hawker version.

**Rice:** chicken rice (steamed), chicken rice (roasted), duck rice, char siew rice, roast pork rice, nasi lemak, nasi briyani (chicken), nasi briyani (mutton), economy rice, claypot rice, Hainanese curry rice, fried rice, seafood fried rice, nasi goreng, nasi padang, mixed vegetable rice, porridge (fish), porridge (century egg), chicken porridge, lor ark rice, bak kut teh, fish soup with rice

**Noodles:** char kway teow, hokkien mee, laksa, mee siam, mee rebus, mee goreng, wanton mee, fishball noodles, bak chor mee, prawn noodles, lor mee, ban mian, fish soup bee hoon, kway chap, yong tau foo, beef kway teow, hor fun, chicken noodle, mee pok, fried bee hoon, mee soto, Hainanese curry noodles, ramen

**Breakfast and bread:** kaya toast, soft-boiled eggs, plain prata, egg prata, thosai, masala thosai, appam, chwee kueh, carrot cake (white), carrot cake (black), chee cheong fun, you tiao, roti john, curry puff, egg tart, bao (char siew), bao (big pau), siew mai, lo mai gai, popiah, epok-epok, murtabak

**Meat, fish and sides:** satay (chicken), satay (beef), otah, chilli crab, black pepper crab, sambal stingray, fried chicken wing, har cheong gai, chicken curry, beef rendang, sayur lodeh, ngoh hiang, fishball, fried tofu, steamed egg, stir-fried kangkong, sambal kangkong

**Snacks and kueh:** ondeh ondeh, kueh lapis, ang ku kueh, putu piring, apam balik, goreng pisang, pineapple tart, kueh salat, muah chee, tau huay, rojak, fried spring roll

**Drinks:** kopi, kopi C, kopi O, kopi peng, teh, teh C, teh O, teh tarik, milo, milo dinosaur, bandung, barley, sugarcane juice, lime juice, soya bean milk, chin chow, bubble tea

**Desserts:** chendol, ice kachang, tau suan, bubur cha cha, mango sago, cheng tng, orh nee, durian pengat
