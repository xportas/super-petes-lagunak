const SCRIPT_TEMA = `(function(){try{var m=document.cookie.match(/(?:^|;\\s*)tema=([^;]*)/);var t=m?decodeURIComponent(m[1]):null;if(t!=='light'&&t!=='dark')t='dark';var h=document.documentElement;if(t==='dark'){h.classList.add('dark');}else{h.classList.remove('dark');}h.setAttribute('data-theme',t);h.style.colorScheme=t;}catch(e){}})();`;

export function ThemeScript(): React.JSX.Element {
  return (
    <script
      id="tema-init"
      dangerouslySetInnerHTML={{ __html: SCRIPT_TEMA }}
    />
  );
}
