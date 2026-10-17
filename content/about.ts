/**
 * The About prose.
 *
 * Lives in its own module because the old About section pasted PROFILE.blurb
 * verbatim — the hero and the About said the same sentence twice, which is the
 * duplication the v3 plan set out to kill. Three paragraphs, kept short: the
 * long route in, the one thing optimised for, and where things currently
 * stand. Numbers here are restated from the timeline and project cards, never
 * introduced fresh, so a reader who only skims prose cannot be misled.
 */

export const ABOUT: { paras: string[] } = {
  paras: [
    "I took the long route. After ACS (Independent) I spent two years as a Ground Response Force officer in the Singapore Police Force — negotiating real incidents as a sergeant, then automating the department's data reporting and prototyping a reminder device with a Micro:bit. Surveying 2,000+ SME owners as a research intern at 108 Growth Partners is what pointed me at data; I read computer science at UCL.",
    "What I optimise for is one thing: agentic systems that measurably work. As product, at Onflow, where simulated users fed a beta that converted 30%. As platform, at Overmind, across an observability and eval pipeline where a fine-tuned Qwen model outperformed GPT-5.6 Terra on BioRED. As research, in pixel-grounded usability evaluation, published on arXiv. Ship it, instrument it, evaluate it, improve it — the loop is the point.",
    "Currently: second year at UCL on a predicted First Class, Vice-President of the Data Science Society, and pointing at robot learning through BuildAPolicy — turning two webcam teleop demos into hundreds of verified training episodes an hour.",
  ],
};
