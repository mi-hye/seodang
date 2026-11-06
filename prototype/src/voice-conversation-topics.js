// Local introductions are free to read/listen to; only learner conversation starts the server clock.
export const conversationTopics=[
 {id:'daily',ko:'오늘 하루',ja:'今日のこと',intro:{ko:'오늘은 하루 이야기를 해 봐요. 오늘 뭐 했어요?',ja:'今日は一日のことを話しましょう。今日は何をしましたか？'}},
 {id:'cafe',ko:'카페에서',ja:'カフェで',intro:{ko:'카페에 왔어요. 어떤 음료를 좋아해요?',ja:'カフェに来ました。どんな飲み物が好きですか？'}},
 {id:'travel',ko:'여행 이야기',ja:'旅行の話',intro:{ko:'여행 이야기를 해 봐요. 어디에 가 보고 싶어요?',ja:'旅行の話をしましょう。どこに行ってみたいですか？'}},
 {id:'hobby',ko:'좋아하는 것',ja:'好きなこと',intro:{ko:'좋아하는 걸 이야기해 봐요. 쉬는 날에는 주로 뭘 해요?',ja:'好きなことを話しましょう。休みの日はよく何をしますか？'}}
];
export function topicIntroduction(topic,direction){const korean=direction==='ja-ko';return {role:'assistant',text:topic.intro[korean?'ko':'ja'],meaning:topic.intro[korean?'ja':'ko']};}
export const topicImage=topic=>`assets/conversation/topic-${topic.id}-v1.webp`;
