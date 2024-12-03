import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { UserBehavior } from "../entities/user-behavior.entity";
import { Video } from "../../content/entities/video.entity";
import { TagService } from "../../content/services/tag.service";

@Injectable()
export class RecommendationService {
  constructor(
    @InjectRepository(UserBehavior)
    private behaviorRepository: Repository<UserBehavior>,
    @InjectRepository(Video)
    private videoRepository: Repository<Video>,
    private tagService: TagService,
  ) {}

  // 1. 协同过滤推荐
  async getCollaborativeRecommendations(userId: string): Promise<Video[]> {
    // 1.1 获取相似用户
    const similarUsers = await this.findSimilarUsers(userId);
    
    // 1.2 获取相似用户喜欢的视频
    const recommendations = await this.getSimilarUserVideos(similarUsers);
    
    return recommendations;
  }

  // 2. 基于内容的推荐
  async getContentBasedRecommendations(videoId: string): Promise<Video[]> {
    // 2.1 获取视频特征
    const video = await this.videoRepository.findOne({
      where: { id: videoId },
      relations: ['tagEntities', 'categories', 'actors', 'directors']
    });

    // 2.2 计算相似视频
    const similarVideos = await this.findSimilarVideos(video);

    return similarVideos;
  }

  // 3. 混合推荐
  async getHybridRecommendations(userId: string): Promise<Video[]> {
    // 3.1 获取用户画像
    const userProfile = await this.getUserProfile(userId);

    // 3.2 根据用户画像权重混合推荐
    const recommendations = await this.getWeightedRecommendations(userProfile);

    return recommendations;
  }

  // 辅助方法
  private async findSimilarUsers(userId: string) {
    // 基于用户行为相似度计算
    return [];
  }

  private async getSimilarUserVideos(users: string[]) {
    // 获取用户喜欢的视频
    return [];
  }

  private async findSimilarVideos(video: Video) {
    // 基于标签、分类、演员等特征计算相似度
    return [];
  }

  private async getUserProfile(userId: string) {
    // 分析用户行为生成画像
    return {};
  }

  private async getWeightedRecommendations(userProfile: any): Promise<Video[]> {
    const weights = {
      collaborative: 0.4,
      contentBased: 0.3,
      tagBased: 0.3
    };

    // 1. 获取各种推荐结果
    const [collaborative, contentBased, tagBased] = await Promise.all([
      this.getCollaborativeRecommendations(userProfile.userId),
      this.getContentBasedRecommendations(userProfile.lastWatchedVideo),
      this.getTagBasedRecommendations(userProfile.favoriteTags)
    ]);

    // 2. 根据权重合并结果
    const weightedResults = new Map<string, { video: Video; score: number }>();

    // 处理协同过滤结果
    collaborative.forEach((video, index) => {
      weightedResults.set(video.id, {
        video,
        score: (1 - index / collaborative.length) * weights.collaborative
      });
    });

    // 处理基于内容的结果
    contentBased.forEach((video, index) => {
      const existing = weightedResults.get(video.id);
      const score = (1 - index / contentBased.length) * weights.contentBased;
      if (existing) {
        existing.score += score;
      } else {
        weightedResults.set(video.id, { video, score });
      }
    });

    // 处理基于标签的结果
    tagBased.forEach((video, index) => {
      const existing = weightedResults.get(video.id);
      const score = (1 - index / tagBased.length) * weights.tagBased;
      if (existing) {
        existing.score += score;
      } else {
        weightedResults.set(video.id, { video, score });
      }
    });

    // 3. 排序并返回结果
    return Array.from(weightedResults.values())
      .sort((a, b) => b.score - a.score)
      .map(item => item.video);
  }

  private async getTagBasedRecommendations(favoriteTags: string[]): Promise<Video[]> {
    // 基于用户喜欢的标签推荐视频
    return [];
  }
} 