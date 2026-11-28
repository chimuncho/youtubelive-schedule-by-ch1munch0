/**
 * 推しスケ！ ＆ 推しマド！ 共通設定（config.js）
 */
window.OSHISUKE_CONFIG = Object.freeze({
  GAS_URL: 'https://script.google.com/macros/s/AKfycbzKEjdp1EPCZ_8jCAvaGfTdOA9kCVBnau0XdnR9-uuj7kYlAbqp-jRQrAouMQnUSqPs/exec',
  CACHE_KEYS: {
    LIVES: 'oshisuke_lives_cache_v8',
    FULL: 'oshisuke_full_cache_v8',
    BM_TAGS: 'oshisuke_bm_tags_cache_v2'
  },
  AUTO_REFRESH_INTERVAL_MS: 3 * 60 * 1000,
  NEW_BADGE_MAX_SEEN: 4,
  ALLOWED_IMAGE_HOSTS: [
    'i.ytimg.com',
    'i1.ytimg.com',
    'i2.ytimg.com',
    'i3.ytimg.com',
    'i4.ytimg.com',
    'img.youtube.com',
    'yt3.ggpht.com',
    'yt3.googleusercontent.com'
  ]
});
