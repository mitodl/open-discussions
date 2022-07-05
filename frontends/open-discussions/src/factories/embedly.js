// @flow

export const makeArticle = () => ({
  provider_url: "https://www.nytimes.com",
  description:
    'The German government said in a statement that Ms. Merkel, President Emmanuel Macron of France and Prime Minister Theresa May of Britain agreed after speaking on the phone that if the tariffs go into force, "The European Union should be ready to decisively defend its interests within the framework of multilateral trade rules."',
  title:       "U.S. Allies Brace for Trade War as Tariff Negotiations Stall",
  author_name: "Jack Ewing and Ana Swanson",
  url:
    "https://www.nytimes.com/2018/04/29/us/politics/us-allies-trade-war-tariff-negotiations.html",
  thumbnail_url:
    "https://static01.nyt.com/images/2018/04/30/us/30globaltrade-1/30globaltrade-1-facebookJumbo.jpg",
  thumbnail_width:  1050,
  version:          "1.0",
  provider_name:    "Nytimes",
  type:             "link",
  thumbnail_height: 549
})

export const makeImage = () => ({
  provider_url:  "http://imgur.com",
  url:           "http://imgur.com/Z0vhwxm.jpg",
  height:        1152,
  width:         863,
  version:       "1.0",
  provider_name: "Imgur",
  type:          "photo"
})

export const makeTweet = () => ({
  provider_url:    "http://twitter.com",
  description:     "just setting up my twttr",
  title:           "jack on Twitter",
  author_name:     "jack",
  thumbnail_width: 400,
  html:
    '<blockquote class="twitter-tweet"><a href="https://twitter.com/jack/status/20?ref_src=embedly"></a></blockquote><script async src="//platform.twitter.com/widgets.js" charset="utf-8"></script>',
  author_url:    "http://twitter.com/jack",
  version:       "1.0",
  provider_name: "Twitter",
  thumbnail_url:
    "https://pbs.twimg.com/profile_images/839863609345794048/mkpdB9Tf_400x400.jpg",
  type:             "rich",
  thumbnail_height: 400
})

export const makeYoutubeVideo = () => ({
  provider_url: "https://www.youtube.com/",
  description:
    "This is one of our best dog compilations! Chihuahuas are sooo funny! The hardest TRY NOT TO LAUGH challenge in the World! Just look how all these chihuahuas behave, play, fail, make funny sounds, react to different things,... So ridiculous, funny and cute! What is your favorite clip?",
  title:
    "Are CHIHUAHUAS the FUNNIEST DOGS? - Funny CHIHUAHUA DOG videos that will make you LAUGH LIKE HELL",
  url:              "http://www.youtube.com/watch?v=3z9gO6U5U2Y",
  author_name:      "Tiger Productions",
  height:           480,
  thumbnail_width:  480,
  width:            854,
  html:             "<div>dummy html</div>",
  author_url:       "https://www.youtube.com/user/wloltigerlolw2",
  version:          "1.0",
  provider_name:    "YouTube",
  thumbnail_url:    "https://i.ytimg.com/vi/3z9gO6U5U2Y/hqdefault.jpg",
  type:             "video",
  thumbnail_height: 360
})
