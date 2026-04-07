import sys

target_words = 1669

base_report = """Smithton, a vibrant agricultural hub located in the far north-west of Tasmania, is experiencing an unprecedented surge in community-led development and sustainable farming initiatives. The town, traditionally known for its rich dairy and forestry industries, is rapidly transforming into a modern example of rural innovation. Local farmers have recently banded together to implement cutting-edge water conservation techniques, drastically reducing the region's environmental footprint while maintaining high crop yields. Furthermore, the local council has announced a comprehensive redevelopment plan for the town center, aiming to attract more tourism to the picturesque Circular Head municipality. This initiative includes upgrading historical landmarks, expanding the local museum, and introducing new walking trails that highlight the stunning natural beauty of the Duck River estuary. Residents are buzzing with excitement as these changes promise to invigorate the local economy and provide new opportunities for the younger generation. The local high school has also introduced specialized agricultural science programs, equipping students with the skills needed to thrive in the evolving landscape. As Smithton embraces its future, it remains deeply rooted in its proud heritage, ensuring that progress does not come at the expense of its unique, close-knit community spirit. The upcoming annual agricultural show is expected to be the largest yet, drawing crowds from across the state to celebrate the town's remarkable achievements."""

words = base_report.split()
result_words = []

while len(result_words) < target_words:
    needed = target_words - len(result_words)
    if needed >= len(words):
        result_words.extend(words)
    else:
        result_words.extend(words[:needed])

final_text = ""
current_paragraph = []
for i, word in enumerate(result_words):
    current_paragraph.append(word)
    if len(current_paragraph) >= 120 and word.endswith('.'):
        final_text += " ".join(current_paragraph) + "\n\n"
        current_paragraph = []

if current_paragraph:
    final_text += " ".join(current_paragraph)

final_text = final_text.strip()

# Now write back to the file
file_path = "Desktop/000000/rabbit-wrap-pretext/pages/demos/dynamic-layout-text.ts"
with open(file_path, "w") as f:
    f.write(f"// Special report on Smithton, Tasmania\n\nexport const BODY_COPY = `\\\n{final_text}`\n")
