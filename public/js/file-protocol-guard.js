;(function () {
  if (location.protocol !== 'file:') return
  var html =
    '<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>entree-carto</title></head>' +
    '<body style="font-family:system-ui,sans-serif;max-width:40rem;margin:2rem auto;line-height:1.5;padding:0 1rem">' +
    '<h1>Ouverture <code>file://</code> non supportée</h1>' +
    '<p>Les navigateurs bloquent les modules JavaScript d’une build Vite ouverte directement sur le disque (politique de sécurité, pas un bug du projet).</p>' +
    '<p>Depuis le dossier du projet&nbsp;:</p><pre style="background:#f6f6f6;padding:1rem;border-radius:4px">npm run preview</pre>' +
    '<p>Simulation GitHub Pages&nbsp;: <code>npm run serve:pages</code></p></body></html>'
  document.open()
  document.write(html)
  document.close()
})()
