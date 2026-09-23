// Curated DNS Blocklists for Pi-hole and DNS Providers

export const PRIVATE_DNS_PROVIDERS = [
  {
    id: 'cleanbrowsing_adult',
    name: 'CleanBrowsing Adult Filter (Recommended)',
    host: 'adult-filter-dns.cleanbrowsing.org',
    ipv4: ['185.228.168.10', '185.228.169.11'],
    description: 'Blocks adult websites, forces Google/Bing SafeSearch and YouTube Restricted Mode directly via DNS.',
    recommended: true
  },
  {
    id: 'cloudflare_family',
    name: 'Cloudflare 1.1.1.3 Family',
    host: 'family.cloudflare-dns.com',
    ipv4: ['1.1.1.3', '1.0.0.3'],
    description: 'Blocks malware and adult sites with maximum speed and ultra-low global latency.',
    recommended: false
  },
  {
    id: 'adguard_family',
    name: 'AdGuard Family Protection',
    host: 'family.adguard-dns.com',
    ipv4: ['94.140.14.15', '94.140.15.16'],
    description: 'Blocks advertisements, trackers, and NSFW content with SafeSearch enforcement.',
    recommended: false
  }
];

export const PIHOLE_NSFW_ADLISTS = [
  {
    name: 'StevenBlack Adult Extension',
    url: 'https://raw.githubusercontent.com/StevenBlack/hosts/master/alternates/fakenews-gambling-porn/hosts',
    category: 'Porn + Gambling + FakeNews',
    count: '~180,000 domains',
    description: 'The most reliable list in the world, updated daily with zero false positives.'
  },
  {
    name: 'OISD NSFW Big List',
    url: 'https://nsfw.oisd.nl',
    category: 'Adult / NSFW Aggressive',
    count: '~240,000 domains',
    description: 'Comprehensive high-performance list that eliminates adult portals and cam sites.'
  },
  {
    name: 'HaGeZi Multi PRO++ Adult Protection',
    url: 'https://raw.githubusercontent.com/hagezi/dns-blocklists/main/adblock/pro.plus.txt',
    category: 'Extreme Hardening',
    count: '~310,000 domains',
    description: 'Extreme coverage against hardcore domains, sexual trackers, and bypass proxies.'
  },
  {
    name: 'URLhaus Adult & Malicious Phishing',
    url: 'https://malware-filter.gitlab.io/urlhaus-filter/urlhaus-filter-hosts.txt',
    category: 'Malware & Dark Web Adult',
    count: '~45,000 domains',
    description: 'Blocks NSFW websites infected with malware and spyware.'
  }
];

export const SAFESEARCH_CNAME_REWRITES = [
  {
    service: 'Google Search',
    domain: 'www.google.com',
    target: 'forcesafesearch.google.com',
    desc: 'Forces SafeSearch across all Google Search and Google Images queries.'
  },
  {
    service: 'DuckDuckGo',
    domain: 'duckduckgo.com',
    target: 'safe.duckduckgo.com',
    desc: 'Prevents disabling SafeSearch on DuckDuckGo.'
  },
  {
    service: 'Bing Search',
    domain: 'www.bing.com',
    target: 'strict.bing.com',
    desc: 'Sets Bing to permanent Strict mode.'
  },
  {
    service: 'YouTube Restricted Mode',
    domain: 'www.youtube.com',
    target: 'restrict.youtube.com',
    desc: 'Hides inappropriate videos and comments on YouTube network-wide.'
  }
];

export const CANARY_TEST_DOMAINS = [
  'pornhub.com',
  'xvideos.com',
  'xnxx.com',
  'chaturbate.com',
  'redtube.com'
];
