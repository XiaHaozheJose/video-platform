export class TitleCleaner {
  static clean(title: string): string {
    return title
      // 移除所有标点符号和特殊字符
      .replace(/[^\w\s]/g, '')
      // 移除多余空格
      .replace(/\s+/g, '')
      // 转换为小写
      .toLowerCase()
      // 移除季数标识，如"第一季"、"S1"等
      .replace(/(第.*?季|s\d+)/g, '')
      // 移除其他常见标识，如"全集"、"完结"等
      .replace(/(全集|完结|高清|蓝光|修复版|重制版)/g, '')
      .trim();
  }

  static similarity(title1: string, title2: string): number {
    const clean1 = this.clean(title1);
    const clean2 = this.clean(title2);
    
    // 使用编辑距离算法计算相似度
    const distance = this.levenshteinDistance(clean1, clean2);
    const maxLength = Math.max(clean1.length, clean2.length);
    
    // 返回相似度百分比
    return (1 - distance / maxLength) * 100;
  }

  private static levenshteinDistance(str1: string, str2: string): number {
    const m = str1.length;
    const n = str2.length;
    const dp: number[][] = Array(m + 1).fill(0).map(() => Array(n + 1).fill(0));

    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (str1[i - 1] === str2[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1];
        } else {
          dp[i][j] = Math.min(
            dp[i - 1][j - 1] + 1,
            dp[i - 1][j] + 1,
            dp[i][j - 1] + 1
          );
        }
      }
    }

    return dp[m][n];
  }
} 