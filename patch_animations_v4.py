import re

# -------------
# 1. STYLE.CSS
# -------------
with open('style.css', 'r') as f:
    css = f.read()

# Replace modal animations and add lightbox
css = re.sub(r'@keyframes modalOverlayFade.*?\n\s*100% \{[^\}]+\}\n\}', '', css, flags=re.DOTALL)
css = re.sub(r'@keyframes modalPop.*?\n\s*100% \{[^\}]+\}\n\}', '', css, flags=re.DOTALL)

overlay_orig = r'.modal-overlay \{ position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba\(0,0,0,0.9\); display: flex; justify-content: center; align-items: center; z-index: 1000; backdrop-filter: blur\(8px\); -webkit-backdrop-filter: blur\(8px\);\}'
overlay_new = """.modal-overlay { 
  position: fixed; top: 0; left: 0; right: 0; bottom: 0; 
  background: rgba(0,0,0,0.9); z-index: 40000; 
  display: flex; justify-content: center; align-items: center; 
  opacity: 0; pointer-events: none; visibility: hidden;
  backdrop-filter: blur(0px); -webkit-backdrop-filter: blur(0px);
  transition: opacity 0.3s ease, backdrop-filter 0.3s ease, visibility 0.3s;
}
.modal-overlay.show { 
  opacity: 1; pointer-events: all; visibility: visible;
  backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
}"""
css = css.replace(overlay_orig, overlay_new)

# Remove the ones using style*=
css = re.sub(r'\.modal-overlay\[style\*\="display: flex"\].*?forwards; \}', '', css)

content_orig = r'.modal-content \{ background: var\(--bg-carbon\); padding: 25px; border-radius: 16px; border: 1px solid var\(--glass-border\); width: 90%; max-width: 400px; text-align: center; box-shadow: 0 20px 50px rgba\(0,0,0,1\); \}'
content_new = """.modal-content { 
  background: var(--bg-carbon); padding: 25px; border-radius: 16px; 
  border: 1px solid var(--glass-border); width: 90%; max-width: 400px; 
  text-align: center; box-shadow: 0 20px 50px rgba(0,0,0,1); 
  transform: scale(0.85) translateY(20px);
  transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}
.modal-overlay.show .modal-content {
  transform: scale(1) translateY(0);
}"""
css = css.replace(content_orig, content_new)

lightbox_css = """
#global-lightbox {
  position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
  background: rgba(0,0,0,0.95); z-index: 199999;
  display: flex; justify-content: center; align-items: center;
  opacity: 0; pointer-events: none; visibility: hidden;
  transition: opacity 0.2s ease, visibility 0.2s;
}
#global-lightbox.show {
  opacity: 1; pointer-events: all; visibility: visible;
}
#global-lightbox img {
  max-width: 95vw; max-height: 95vh; object-fit: contain;
  transform: scale(0.9); transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}
#global-lightbox.show img { transform: scale(1); }
"""
css += lightbox_css

with open('style.css', 'w') as f:
    f.write(css)


# -------------
# 2. INDEX.HTML
# -------------
with open('index.html', 'r') as f:
    html = f.read()

# Add universal JS functions and lightbox at bottom of body
js_inject = """  <div id="global-lightbox" onclick="closeLightbox()"><img id="global-lightbox-img" src=""></div>
  <script>
    window.openModal = function(id) { document.getElementById(id).classList.add('show'); };
    window.closeModal = function(id) { document.getElementById(id).classList.remove('show'); };
    window.openLightbox = function(src) { 
        document.getElementById('global-lightbox-img').src = src; 
        document.getElementById('global-lightbox').classList.add('show'); 
    };
    window.closeLightbox = function() { document.getElementById('global-lightbox').classList.remove('show'); };
  </script>
</body>"""
html = html.replace("</body>", js_inject)

# Replace all inline display='' logic with openModal/closeModal
html = re.sub(r"document\.getElementById\('([^']+)'\)\.style\.display='flex'", r"openModal('\1')", html)
html = re.sub(r"document\.getElementById\('([^']+)'\)\.style\.display='none'", r"closeModal('\1')", html)
# Let's also remove style="display:none;" from modals because they are hidden by CSS classes now
html = re.sub(r'class="modal-overlay" style="display:none;', r'class="modal-overlay" style="', html)
html = re.sub(r'class="modal-overlay" style="display: none;', r'class="modal-overlay" style="', html)

# Fix touch pseudo-class bug for mission-cards
html = html.replace('class="mission-card"', 'class="mission-card" ontouchstart=""')

with open('index.html', 'w') as f:
    f.write(html)


# -------------
# 3. APP.JS
# -------------
with open('app.js', 'r') as f:
    app_js = f.read()

# Update JS display replacements
app_js = re.sub(r"document\.getElementById\('([^']+)'\)\.style\.display\s*=\s*'flex'", r"openModal('\1')", app_js)
app_js = re.sub(r"document\.getElementById\('([^']+)'\)\.style\.display\s*=\s*'none'", r"closeModal('\1')", app_js)

# Fix zoomable image logic in renderRoutine and library
# renderRoutine zoomable-image onclick
# We need to find `.zoomable-image` assignment logic. 
# Usually it's in the generated HTML for exercises.
app_js = re.sub(r"this\.classList\.toggle\('zoomed-image'\)", r"openLightbox(this.src)", app_js)
app_js = app_js.replace("class=\"zoomable-image\"", "class=\"zoomable-image\" onclick=\"openLightbox(this.src)\"")

with open('app.js', 'w') as f:
    f.write(app_js)

print("Patching complete.")
