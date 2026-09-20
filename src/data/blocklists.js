// Curated DNS Blocklists for Pi-hole and DNS Providers

export const PRIVATE_DNS_PROVIDERS = [
  {
    id: 'cleanbrowsing_adult',
    name: 'CleanBrowsing Adult Filter (Consigliato)',
    host: 'adult-filter-dns.cleanbrowsing.org',
    ipv4: ['185.228.168.10', '185.228.169.11'],
    description: 'Blocca siti per adulti, forza Google/Bing SafeSearch e YouTube Restricted Mode direttamente via DNS.',
    recommended: true
  },
  {
    id: 'cloudflare_family',
    name: 'Cloudflare 1.1.1.3 Family',
    host: 'family.cloudflare-dns.com',
    ipv4: ['1.1.1.3', '1.0.0.3'],
    description: 'Blocca malware e siti pornografici con la massima velocità e latenza minima globale.',
    recommended: false
  },
  {
    id: 'adguard_family',
    name: 'AdGuard Family Protection',
    host: 'family.adguard-dns.com',
    ipv4: ['94.140.14.15', '94.140.15.16'],
    description: 'Blocca annunci pubblicitari, tracker e contenuti NSFW con enforcement di SafeSearch.',
    recommended: false
  }
];

export const PIHOLE_NSFW_ADLISTS = [
  {
    name: 'StevenBlack Adult Extension',
    url: 'https://raw.githubusercontent.com/StevenBlack/hosts/master/alternates/fakenews-gambling-porn/hosts',
    category: 'Porn + Gambling + FakeNews',
    count: '~180,000 domini',
    description: 'La lista più affidabile al mondo, aggiornata quotidianamente con zero falsi positivi.'
  },
  {
    name: 'OISD NSFW Big List',
    url: 'https://nsfw.oisd.nl',
    category: 'Adult / NSFW Aggressive',
    count: '~240,000 domini',
    description: 'Elenco completo ad alte prestazioni che elimina qualunque portale erotico o cam.'
  },
  {
    name: 'HaGeZi Multi PRO++ Adult Protection',
    url: 'https://raw.githubusercontent.com/hagezi/dns-blocklists/main/adblock/pro.plus.txt',
    category: 'Extreme Hardening',
    count: '~310,000 domini',
    description: 'Copertura estrema contro domini hard-core, tracker sessuali e proxy di aggiramento.'
  },
  {
    name: 'URLhaus Adult & Malicious Phishing',
    url: 'https://malware-filter.gitlab.io/urlhaus-filter/urlhaus-filter-hosts.txt',
    category: 'Malware & Dark Web Adult',
    count: '~45,000 domini',
    description: 'Blocca siti NSFW infetti da malware e spyware.'
  }
];

export const SAFESEARCH_CNAME_REWRITES = [
  {
    service: 'Google Search',
    domain: 'www.google.com',
    target: 'forcesafesearch.google.com',
    desc: 'Forza la modalità SafeSearch su tutte le ricerche Google e Google Immagini.'
  },
  {
    service: 'DuckDuckGo',
    domain: 'duckduckgo.com',
    target: 'safe.duckduckgo.com',
    desc: 'Impedisce la disattivazione del filtro SafeSearch su DuckDuckGo.'
  },
  {
    service: 'Bing Search',
    domain: 'www.bing.com',
    target: 'strict.bing.com',
    desc: 'Imposta Bing in modalità Strict permanente.'
  },
  {
    service: 'YouTube Restricted Mode',
    domain: 'www.youtube.com',
    target: 'restrict.youtube.com',
    desc: 'Nasconde video inappropriati e commenti su YouTube a livello di rete.'
  }
];

export const CANARY_TEST_DOMAINS = [
  'pornhub.com',
  'xvideos.com',
  'xnxx.com',
  'chaturbate.com',
  'redtube.com'
];
