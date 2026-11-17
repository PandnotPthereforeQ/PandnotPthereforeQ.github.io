// Small, dependency-free Markdown renderer for the site's authored content.
// Generated HTML is built from escaped text; raw HTML in Markdown is not trusted.
(() => {
    const escapeHtml = (value) => value.replace(/[&<>"']/g, (character) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[character]);

    function renderInline(source) {
        const protectedValues = [];
        const protect = (html) => {
            const token = `@@PROTECTED_${protectedValues.length}@@`;
            protectedValues.push(html);
            return token;
        };

        // Keep inline math and code literal while applying Markdown formatting.
        source = source.replace(/\$[^$\n]+\$/g, (math) => protect(escapeHtml(math)));
        source = source.replace(/`([^`]+)`/g, (_match, code) => protect(`<code>${escapeHtml(code)}</code>`));
        let html = escapeHtml(source);

        html = html.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+|mailto:[^\s)]+)\)/g,
            (_match, label, href) => `<a href="${href}" rel="noopener noreferrer">${label}</a>`);
        html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
        html = html.replace(/__(.+?)__/g, "<strong>$1</strong>");
        html = html.replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, "<em>$1</em>");
        html = html.replace(/(?<!_)_([^_\n]+)_(?!_)/g, "<em>$1</em>");
        html = html.replace(/  \n/g, "<br>\n");
        html = html.replace(/@@PROTECTED_(\d+)@@/g, (_match, index) => protectedValues[Number(index)]);
        return html;
    }

    function renderMarkdown(markdown) {
        const lines = markdown.replace(/\r\n?/g, "\n").trim().split("\n");
        const output = [];
        let index = 0;

        while (index < lines.length) {
            const line = lines[index];
            if (!line.trim()) {
                index++;
                continue;
            }

            const fence = line.match(/^\s*```\s*([\w-]*)\s*$/);
            if (fence) {
                const codeLines = [];
                index++;
                while (index < lines.length && !/^\s*```\s*$/.test(lines[index])) {
                    codeLines.push(lines[index++]);
                }
                if (index < lines.length) index++;
                const languageClass = fence[1] ? ` class="language-${escapeHtml(fence[1])}"` : "";
                output.push(`<pre><code${languageClass}>${escapeHtml(codeLines.join("\n"))}</code></pre>`);
                continue;
            }

            const heading = line.match(/^ {0,3}(#{1,4})\s+(.+?)\s*#*\s*$/);
            if (heading) {
                const level = Math.min(heading[1].length + 1, 6);
                output.push(`<h${level}>${renderInline(heading[2])}</h${level}>`);
                index++;
                continue;
            }

            const listMatch = line.match(/^\s*([-*+]\s+|\d+\.\s+)/);
            if (listMatch) {
                const ordered = /^\d/.test(listMatch[1]);
                const tag = ordered ? "ol" : "ul";
                const items = [];
                while (index < lines.length) {
                    const item = lines[index].match(/^\s*([-*+]\s+|\d+\.\s+)(.*)$/);
                    if (!item || (/^\d/.test(item[1])) !== ordered) break;
                    let text = item[2];
                    index++;
                    while (index < lines.length && /^\s{2,}\S/.test(lines[index]) && !/^\s*([-*+]\s+|\d+\.\s+)/.test(lines[index])) {
                        text += `\n${lines[index].trim()}`;
                        index++;
                    }
                    items.push(`<li>${renderInline(text)}</li>`);
                }
                output.push(`<${tag}>${items.join("")}</${tag}>`);
                continue;
            }

            if (/^\s*>\s?/.test(line)) {
                const quoteLines = [];
                while (index < lines.length && /^\s*>/.test(lines[index])) {
                    quoteLines.push(lines[index++].replace(/^\s*>\s?/, ""));
                }
                output.push(`<blockquote><p>${renderInline(quoteLines.join(" "))}</p></blockquote>`);
                continue;
            }

            const paragraph = [line.trim()];
            index++;
            while (index < lines.length && lines[index].trim() &&
                   !/^\s*```/.test(lines[index]) &&
                   !/^ {0,3}#{1,4}\s/.test(lines[index]) &&
                   !/^\s*([-*+]\s+|\d+\.\s+)/.test(lines[index]) &&
                   !/^\s*>/.test(lines[index])) {
                paragraph.push(lines[index].trim());
                index++;
            }
            output.push(`<p>${renderInline(paragraph.join(" "))}</p>`);
        }

        return output.join("\n");
    }

    ["research", "preprints", "talks"].forEach((section) => {
        const source = document.getElementById(`${section}-markdown`);
        const target = document.getElementById(`${section}-content`);
        if (source && target) target.innerHTML = renderMarkdown(source.textContent);
    });
})();
