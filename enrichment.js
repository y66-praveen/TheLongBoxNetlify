// 616 Archive — enrichment data (writers + one-line summaries)
// Kept separate from data.js so the large core dataset never needs to be
// regenerated when this file grows. Keyed by "Series||Issue".
// Coverage: the "Essential", "Major", and "Recommended" tier issues (136
// total) get a real per-issue summary AND writer. Every other issue falls
// back to WRITER_RUNS below (writer-only, no summary) when it falls inside
// a verified run; "Semi Optional"/"Optional" tier issues with no verified
// run remain uncatalogued. See the About page for scope notes.

const ENRICHMENT = {
  "Fantastic Four||1": { w: "Stan Lee", s: "The debut of Marvel's First Family and the launch of the Marvel Age of Comics." },
  "Fantastic Four||4": { w: "Stan Lee", s: "The Sub-Mariner returns, reintroducing Namor into the modern Marvel Universe." },
  "Incredible Hulk||1": { w: "Stan Lee", s: "The gamma-bomb origin of Bruce Banner and the Hulk." },
  "Fantastic Four||5": { w: "Stan Lee", s: "The first appearance of Doctor Doom, the Fantastic Four's greatest foe." },
  "Journey Into Mystery||83": { w: "Stan Lee", s: "The first appearance of Thor, the Asgardian God of Thunder." },
  "Amazing Fantasy||15": { w: "Stan Lee", s: "The origin and first appearance of Spider-Man." },
  "Tales to Astonish||35": { w: "Stan Lee", s: "The first appearance of Ant-Man, Henry Pym's size-changing hero." },
  "Fantastic Four||12": { w: "Stan Lee", s: "The Fantastic Four's first clash with the Hulk." },
  "Amazing Spider-Man||1": { w: "Stan Lee", s: "Spider-Man swings into his own ongoing series." },
  "Strange Tales||110": { w: "Stan Lee", s: "The first appearance of Doctor Strange, Master of the Mystic Arts." },
  "Avengers||1": { w: "Stan Lee", s: "Earth's Mightiest Heroes assemble for the first time." },
  "X-Men||1": { w: "Stan Lee", s: "Professor Xavier's first class of mutants debuts, alongside their nemesis Magneto." },
  "Avengers||4": { w: "Stan Lee", s: "Captain America is found frozen in ice and joins the modern Avengers." },
  "X-Men||4": { w: "Stan Lee", s: "Magneto's Brotherhood of Evil Mutants debuts, including Quicksilver and the Scarlet Witch." },
  "Daredevil||1": { w: "Stan Lee", s: "The origin of Matt Murdock, the blind lawyer who becomes Daredevil." },
  "Avengers||16": { w: "Stan Lee", s: "A near-total roster change brings Captain America, Hawkeye, Quicksilver, and the Scarlet Witch together as the new Avengers." },
  "Fantastic Four||45": { w: "Stan Lee", s: "The first appearance of the Inhumans." },
  "Fantastic Four||48": { w: "Stan Lee", s: "The first appearance of Galactus and the Silver Surfer, opening one of Marvel's most celebrated cosmic sagas." },
  "Fantastic Four||50": { w: "Stan Lee", s: "The Galactus Trilogy concludes as the Silver Surfer turns against his master to save Earth." },
  "Fantastic Four||52": { w: "Stan Lee", s: "The first appearance of the Black Panther, Marvel's first Black superhero." },
  "Amazing Spider-Man||50": { w: "Stan Lee", s: "The Kingpin's debut, and Peter Parker's famous \"Spider-Man No More\" walk-away." },
  "Marvel Super-Heroes||12": { w: "Roy Thomas", s: "The origin and first appearance of Captain Marvel (Mar-Vell)." },
  "Captain Marvel||1": { w: "Roy Thomas", s: "Mar-Vell headlines his own ongoing series for the first time." },
  "Silver Surfer||1": { w: "Stan Lee", s: "The Silver Surfer's origin is told in full as he begins his own title." },
  "Avengers||57": { w: "Roy Thomas", s: "The android Vision joins the Avengers for the first time." },
  "Marvel Super-Heroes||18": { w: "Arnold Drake", s: "The first appearance of the original Guardians of the Galaxy." },

  "Avengers||89": { w: "Roy Thomas", s: "The opening chapter of the Kree-Skrull War." },
  "Tomb of Dracula||1": { w: "Gerry Conway", s: "Marvel's version of Count Dracula begins his own horror series." },
  "Hero for Hire||1": { w: "Archie Goodwin", s: "The debut of Luke Cage, Marvel's first Black superhero to headline his own title." },
  "Defenders||1": { w: "Steve Englehart", s: "Doctor Strange, the Hulk, and Sub-Mariner form the loose, non-team known as the Defenders." },
  "Amazing Spider-Man||121": { w: "Gerry Conway", s: "\"The Night Gwen Stacy Died\" — one of the most consequential deaths in superhero comics." },
  "Amazing Spider-Man||122": { w: "Gerry Conway", s: "The Green Goblin (Norman Osborn) dies in the aftermath of Gwen Stacy's death." },
  "Special Marvel Edition||15": { w: "Steve Englehart", s: "The first appearance and origin of Shang-Chi, Master of Kung Fu." },
  "Amazing Spider-Man||129": { w: "Gerry Conway", s: "The first appearance of the Punisher." },
  "Marvel Premiere||15": { w: "Roy Thomas", s: "The origin and first appearance of Iron Fist." },
  "Incredible Hulk||181": { w: "Len Wein", s: "The first full appearance of Wolverine." },
  "Giant-Size X-Men||1": { w: "Len Wein", s: "The all-new, all-different X-Men debut, including Storm, Nightcrawler, Colossus, and Wolverine's first roster appearance." },
  "X-Men||94": { w: "Chris Claremont", s: "The new X-Men team takes over the flagship title, beginning Claremont's landmark run." },
  "Nova||1": { w: "Marv Wolfman", s: "The origin and first appearance of Nova." },
  "Ms. Marvel||1": { w: "Gerry Conway", s: "Carol Danvers debuts as Ms. Marvel." },
  "Spider-Woman||1": { w: "Marv Wolfman", s: "Jessica Drew headlines her own ongoing series as Spider-Woman." },
  "X-Men||129": { w: "Chris Claremont", s: "Kitty Pryde, Emma Frost, and the Hellfire Club all make their first appearance." },
  "X-Men||137": { w: "Chris Claremont", s: "The Dark Phoenix Saga concludes with the death of Jean Grey." },
  "X-Men||141": { w: "Chris Claremont", s: "\"Days of Future Past\" begins, one of the most influential X-Men stories ever told." },
  "X-Men||142": { w: "Chris Claremont", s: "\"Days of Future Past\" concludes." },
  "Marvel Graphic Novel||4": { w: "Chris Claremont", s: "The debut of the New Mutants, Professor Xavier's next generation of students." },
  "Wolverine Limited Series||1": { w: "Chris Claremont", s: "Wolverine's first solo starring vehicle, set in Japan." },
  "New Mutants||1": { w: "Chris Claremont", s: "The New Mutants launch as an ongoing series." },
  "Alpha Flight||1": { w: "John Byrne", s: "Canada's premier superhero team headlines its own ongoing series." },

  "Marvel Super Heroes Secret Wars||1": { w: "Jim Shooter", s: "The Beyonder transports Earth's mightiest heroes and villains to Battleworld, launching Marvel's first major crossover event." },
  "Marvel Super Heroes Secret Wars||2": { w: "Jim Shooter", s: "Heroes and villains alike begin choosing sides and building strongholds across Battleworld." },
  "Marvel Super Heroes Secret Wars||3": { w: "Jim Shooter", s: "The battle for Battleworld escalates as old rivalries flare into open warfare." },
  "Marvel Super Heroes Secret Wars||4": { w: "Jim Shooter", s: "Galactus's hunger turns toward Battleworld itself, threatening every hero and villain stranded there." },
  "Marvel Super Heroes Secret Wars||5": { w: "Jim Shooter", s: "The war for Battleworld claims its first heavy casualties among the heroes." },
  "Marvel Super Heroes Secret Wars||6": { w: "Jim Shooter", s: "Doctor Doom begins scheming to seize god-like power for himself." },
  "Marvel Super Heroes Secret Wars||7": { w: "Jim Shooter", s: "Tensions boil over as Doom's ambitions push the villains toward betrayal and the heroes toward desperation." },
  "Marvel Super Heroes Secret Wars||8": { w: "Jim Shooter", s: "Spider-Man discovers a mysterious black costume that will one day become Venom." },
  "Marvel Super Heroes Secret Wars||9": { w: "Jim Shooter", s: "Doctor Doom moves to claim the Beyonder's near-omnipotent power." },
  "Marvel Super Heroes Secret Wars||10": { w: "Jim Shooter", s: "A power-mad Doctor Doom turns his newfound might against the heroes." },
  "Marvel Super Heroes Secret Wars||11": { w: "Jim Shooter", s: "The heroes make their last stand against an all-powerful Doctor Doom." },
  "Marvel Super Heroes Secret Wars||12": { w: "Jim Shooter", s: "The Beyonder reclaims his power from Doom, and the surviving heroes and villains return home, closing Marvel's original Secret Wars." },

  // ---------------------------------------------------------------------
  // "Major" and "Recommended" tier (75 issues). Where the exact writer for
  // a later or lesser-known issue isn't something I can confidently verify
  // (common for rotating-creative-team "final issue" entries), the writer
  // field is left out rather than guessed -- the summary alone still gives
  // real, checkable context. "Semi Optional" and "Optional" tier issues
  // (~3,312 of them) remain uncatalogued; see the About page for why.
  // ---------------------------------------------------------------------
  "Fantastic Four||2": { w: "Stan Lee", s: "The Fantastic Four face the shapeshifting Skrulls for the first time." },
  "Fantastic Four||3": { w: "Stan Lee", s: "The team adopts their iconic blue uniforms and gains their signature vehicle, the Fantasticar." },
  "Incredible Hulk||2": { w: "Stan Lee", s: "The Hulk's skin color changes from grey to green for the remainder of the series." },
  "Fantastic Four||6": { w: "Stan Lee", s: "Doctor Doom and Namor the Sub-Mariner join forces against the Fantastic Four for the first time." },
  "Incredible Hulk||3": { w: "Stan Lee", s: "An early Hulk adventure exploring Bruce Banner's uneasy control over his transformations." },
  "Journey Into Mystery||85": { w: "Stan Lee", s: "The first appearance of Loki, Thor's adopted brother and archenemy." },
  "Fantastic Four||8": { w: "Stan Lee", s: "The first appearance of the Puppet Master." },
  "Incredible Hulk||6": { w: "Stan Lee", s: "The final issue of the Hulk's original series before its cancellation." },
  "Amazing Spider-Man||2": { w: "Stan Lee", s: "The first appearance of the Vulture." },
  "Sgt. Fury and his Howling Commandos||1": { w: "Stan Lee", s: "Nick Fury leads an elite World War II commando unit in his own ongoing series." },
  "Amazing Spider-Man||3": { w: "Stan Lee", s: "The first appearance of Doctor Octopus." },
  "Amazing Spider-Man||4": { w: "Stan Lee", s: "The first appearance of the Sandman." },
  "Amazing Spider-Man||6": { w: "Stan Lee", s: "The first appearance of the Lizard." },
  "Amazing Spider-Man||14": { w: "Stan Lee", s: "The Green Goblin's first appearance, though his identity remains a mystery." },
  "Amazing Spider-Man||15": { w: "Stan Lee", s: "The first appearance of Kraven the Hunter." },
  "Tales of Suspense||57": { w: "Stan Lee", s: "The first appearance of Hawkeye." },
  "Avengers||8": { w: "Stan Lee", s: "The first appearance of Kang the Conqueror." },
  "Tales to Astonish||60": { w: "Stan Lee", s: "The Hulk returns as a backup feature following his own title's cancellation." },
  "Tales of Suspense||59": { w: "Stan Lee", s: "Captain America becomes a recurring backup feature alongside Iron Man." },
  "X-Men||12": { w: "Stan Lee", s: "The first appearance of the Juggernaut." },
  "Strange Tales||135": { w: "Stan Lee", s: "The debut of Nick Fury, Agent of S.H.I.E.L.D., recast as a modern-day spy series." },
  "X-Men||14": { w: "Stan Lee", s: "The first appearance of the Sentinels." },
  "Amazing Spider-Man||31": { w: "Stan Lee", s: "Gwen Stacy and Harry Osborn are introduced as Peter Parker starts college." },
  "Thor||126": { w: "Stan Lee", s: "Journey Into Mystery is renamed Thor, continuing its numbering." },
  "Fantastic Four||49": { w: "Stan Lee", s: "The Galactus Trilogy continues as Galactus himself arrives on Earth." },
  "Amazing Spider-Man||41": { w: "Stan Lee", s: "The first appearance of the Rhino." },
  "Incredible Hulk||102": { w: "Stan Lee", s: "Tales to Astonish's numbering continues here as the Hulk relaunches into his own title." },
  "Sub-Mariner||1": { w: "Roy Thomas", s: "Namor the Sub-Mariner headlines his own ongoing series for the first time." },
  "Captain America||100": { w: "Stan Lee", s: "Tales of Suspense's numbering continues here as Captain America relaunches into his own title." },
  "Iron Man||1": { w: "Archie Goodwin", s: "Iron Man launches his own ongoing series after years as a Tales of Suspense feature." },
  "Doctor Strange||169": { w: "Roy Thomas", s: "Strange Tales' numbering continues here as Doctor Strange relaunches into his own title." },
  "Nick Fury, Agent of S.H.I.E.L.D.||1": { w: "Jim Steranko", s: "Nick Fury's modern spy adventures launch as their own ongoing series." },
  "Avengers||54": { w: "Roy Thomas", s: "The first appearance of Ultron, in his earliest form." },
  "Marvel Super-Heroes||16": { s: "The first appearance of the Phantom Eagle, a World War I flying ace." },
  "Silver Surfer||2": { w: "Stan Lee", s: "The Silver Surfer's solo cosmic adventures continue." },
  "X-Men||49": { w: "Roy Thomas", s: "The first appearance of Polaris." },
  "Silver Surfer||3": { w: "Stan Lee", s: "The Silver Surfer's solo cosmic adventures continue." },
  "Silver Surfer||4": { w: "Stan Lee", s: "The Silver Surfer's solo cosmic adventures continue." },
  "X-Men||54": { w: "Roy Thomas", s: "The first appearance of Havok, Cyclops' brother." },
  "Silver Surfer||5": { w: "Stan Lee", s: "The Silver Surfer's solo cosmic adventures continue." },
  "Silver Surfer||6": { w: "Stan Lee", s: "The Silver Surfer's solo cosmic adventures continue." },
  "Silver Surfer||7": { w: "Stan Lee", s: "The Silver Surfer's solo cosmic adventures continue." },
  "Silver Surfer||8": { w: "Stan Lee", s: "The Silver Surfer's solo cosmic adventures continue." },
  "Silver Surfer||9": { w: "Stan Lee", s: "The Silver Surfer's solo cosmic adventures continue." },
  "X-Men||66": { w: "Roy Thomas", s: "The final new-material issue before the series shifted entirely to reprints for five years." },
  "Silver Surfer||18": { w: "Stan Lee", s: "The final issue of the Silver Surfer's original ongoing series." },
  "Avengers||90": { w: "Roy Thomas", s: "The Kree-Skrull War escalates as the Avengers are drawn into interstellar conflict." },
  "Avengers||91": { w: "Roy Thomas", s: "The Vision's origins and loyalties come under scrutiny amid the widening war." },
  "Avengers||92": { w: "Roy Thomas", s: "The Avengers split up to fight the Kree-Skrull War on multiple fronts." },
  "Avengers||93": { w: "Roy Thomas", s: "The war reaches Earth as alien forces clash in the streets." },
  "Avengers||94": { w: "Roy Thomas", s: "Rick Jones' latent abilities become crucial to the war's outcome." },
  "Avengers||95": { w: "Roy Thomas", s: "The Avengers mount a desperate defense as the Kree-Skrull War nears its climax." },
  "Avengers||96": { w: "Roy Thomas", s: "The Kree-Skrull War approaches its conclusion." },
  "Avengers||97": { w: "Roy Thomas", s: "The Kree-Skrull War concludes, reshaping the Avengers' place in the cosmos." },
  "Marvel Team-Up||1": { w: "Roy Thomas", s: "Spider-Man and the Human Torch team up in the first issue of a new ongoing series." },
  "Marvel Spotlight||5": { w: "Gary Friedrich", s: "The first appearance of Ghost Rider, the motorcycle-riding Spirit of Vengeance." },
  "Werewolf by Night||1": { w: "Gerry Conway", s: "Jack Russell's werewolf curse continues in his own ongoing series." },
  "Tomb of Dracula||10": { w: "Marv Wolfman", s: "The first appearance of Blade, the vampire hunter." },
  "Avengers||112": { w: "Steve Englehart", s: "The first appearance of Mantis." },
  "Ghost Rider||1": { w: "Gary Friedrich", s: "Ghost Rider launches his own ongoing series." },
  "Sub-Mariner||72": { s: "The final issue of Namor's original ongoing series." },
  "Incredible Hulk||180": { w: "Len Wein", s: "Wolverine makes his cameo debut at the very end of the issue." },
  "Champions||1": { s: "A new West Coast-based super-team debuts, including Angel, Iceman, and Ghost Rider." },
  "Iron Fist||1": { w: "Chris Claremont", s: "Iron Fist headlines his own ongoing series for the first time." },
  "Werewolf by Night||43": { s: "The final issue of Jack Russell's original ongoing series." },
  "Sgt. Fury and his Howling Commandos||167": { s: "The final issue of Sgt. Fury's long-running war series." },
  "Champions||17": { s: "The final issue of the Champions' short-lived run." },
  "Nova||25": { s: "The final issue of Nova's original ongoing series." },
  "Ms. Marvel||23": { w: "Chris Claremont", s: "The final issue of Ms. Marvel's original ongoing series." },
  "Captain Marvel||62": { s: "The final issue of Mar-Vell's original ongoing series." },
  "Tomb of Dracula||70": { w: "Marv Wolfman", s: "The final issue of Marvel's original Dracula series." },
  "X-Men||138": { w: "Chris Claremont", s: "Cyclops leaves the X-Men in the aftermath of the Dark Phoenix Saga." },
  "Ghost Rider||81": { s: "The final issue of Ghost Rider's original ongoing series." },
  "Spider-Woman||50": { s: "The final issue of Jessica Drew's original Spider-Woman series." },
  "Marvel Team-Up||150": { s: "The final issue of Marvel Team-Up, ending its run to make way for Web of Spider-Man." },
};

// ---------------------------------------------------------------------
// WRITER_RUNS — verified writer credit ranges, used as a fallback when an
// issue has no per-issue ENRICHMENT entry above. Sourced from Stan Lee's
// own published bibliography (Wikipedia/Fandom) plus well-documented
// successor runs (Roy Thomas, Gerry Conway, Chris Claremont, Frank Miller,
// Walt Simonson, John Byrne). Deliberately conservative: gaps between
// verified stretches are left uncovered rather than guessed, and a run
// never claims further than the last issue actually checked.
// ---------------------------------------------------------------------
const WRITER_RUNS = {
  "Fantastic Four": [
    { from: 1, to: 114, writer: "Stan Lee" },
    { from: 120, to: 125, writer: "Stan Lee" },
    { from: 232, to: 277, writer: "John Byrne" },
  ],
  "Amazing Spider-Man": [
    { from: 1, to: 100, writer: "Stan Lee" },
    { from: 105, to: 110, writer: "Stan Lee" },
    { from: 111, to: 115, writer: "Gerry Conway" },
    { from: 116, to: 118, writer: "Stan Lee & Gerry Conway" },
    { from: 119, to: 149, writer: "Gerry Conway" },
    { from: 150, to: 155, writer: "Len Wein" },
  ],
  "Incredible Hulk": [
    { from: 1, to: 6, writer: "Stan Lee" },
    { from: 108, to: 120, writer: "Stan Lee" },
  ],
  "Tales to Astonish": [
    { from: 35, to: 101, writer: "Stan Lee" },
  ],
  "Journey Into Mystery": [
    { from: 83, to: 125, writer: "Stan Lee" },
  ],
  "Thor": [
    { from: 126, to: 192, writer: "Stan Lee" },
    { from: 200, to: 200, writer: "Stan Lee" },
    { from: 337, to: 355, writer: "Walt Simonson" },
  ],
  "Avengers": [
    { from: 1, to: 35, writer: "Stan Lee" },
  ],
  "X-Men": [
    { from: 1, to: 19, writer: "Stan Lee" },
    { from: 20, to: 66, writer: "Roy Thomas" },
    { from: 94, to: 196, writer: "Chris Claremont" },
  ],
  "Daredevil": [
    { from: 1, to: 9, writer: "Stan Lee" },
    { from: 11, to: 49, writer: "Stan Lee" },
    { from: 168, to: 191, writer: "Frank Miller" },
  ],
  "Tales of Suspense": [
    { from: 39, to: 98, writer: "Stan Lee" },
  ],
  "Captain America": [
    { from: 100, to: 109, writer: "Stan Lee" },
    { from: 112, to: 112, writer: "Stan Lee" },
    { from: 114, to: 141, writer: "Stan Lee" },
  ],
  "Sgt. Fury and his Howling Commandos": [
    { from: 1, to: 28, writer: "Stan Lee" },
  ],
  "Strange Tales": [
    { from: 110, to: 111, writer: "Stan Lee" },
    { from: 115, to: 142, writer: "Stan Lee" },
    { from: 151, to: 158, writer: "Stan Lee" },
  ],
  "Silver Surfer": [
    { from: 1, to: 18, writer: "Stan Lee" },
  ],
};

function lookupWriterRun(series, issueNum) {
  const runs = WRITER_RUNS[series];
  if (!runs) return null;
  const n = parseInt(issueNum, 10);
  if (isNaN(n)) return null;
  for (const r of runs) {
    if (n >= r.from && n <= r.to) return r.writer;
  }
  return null;
}