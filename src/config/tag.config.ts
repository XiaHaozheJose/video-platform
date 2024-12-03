import { TagType } from '@modules/content/entities/tag.entity';

export const tagConfig = {
  rules: {
    [TagType.GENRE]: {
      maxPerVideo: 3,        // 每个视频最多3个类型标签
      requiresApproval: true // 需要管理员审核
    },
    [TagType.REGION]: {
      maxPerVideo: 1,        // 每个视频只能有1个地区标签
      requiresApproval: false
    },
    [TagType.ERA]: {
      maxPerVideo: 1,        // 每个视频只能有1个年代标签
      requiresApproval: false
    },
    [TagType.FEATURE]: {
      maxPerVideo: 3,        // 每个视频最多3个特征标签
      requiresApproval: true
    },
    [TagType.OTHER]: {
      maxPerVideo: 5,        // 每个视频最多5个其他标签
      requiresApproval: true
    }
  },
  
  // 预定义的标签
  predefinedTags: {
    genres: ['动作', '喜剧', '爱情', '科幻', '恐怖', '动画'],
    regions: ['华语', '欧美', '日韩', '其他'],
    eras: ['2023', '2022', '2021', '2020', '10年代', '00年代', '90年代'],
    features: ['热门', '经典', '高分', '烂片', '必看'],
  }
}; 