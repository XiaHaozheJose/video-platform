
export interface CrawlerThirdResourceDto {
    code: number;
    msg: string;
    page: number;
    pagecount: number;
    limit: number;
    total: number;
    list: CrawlerThirdResourceDataDto[];
    class: CrawlerThirdResourceCategpryDto[];
}

export interface CrawlerThirdResourceCategpryDto {
    type_id: number;
    type_pid: number;
    type_name: string;
}

export interface CrawlerThirdResourceDataDto {
    vod_id: number; // 资源ID
    type_id: number; // 分类ID
    group_id: number; // 分组ID
    vod_name: string; // 资源名称
    vod_en: string; // 资源英文名
    vod_status: number; // 资源状态
    vod_letter: string; // 资源首字母
    vod_pic: string; // 资源封面
    vod_actor: string;
    vod_director: string; // 导演
    vod_writer: string; // 编剧
    vod_behind: string; // 幕后花絮
    vod_blurb: string; // 剧情简介
    vod_remarks: string; // 备注
    vod_pubdate: string; // 上映日期
    vod_total: number; // 总集数
    vod_serial: string; // 连载状态
    vod_weekday: string; // 上映星期
    vod_area: string; // 地区
    vod_lang: string; // 语言
    vod_year: string; // 年份
    vod_version: string; 
    vod_state: string; 
    vod_author: string; 
    vod_jumpurl: string; 
    vod_tpl: string;
    vod_tpl_play: string;
    vod_tpl_down: string;
    vod_isend: number;
    vod_lock: number;
    vod_level: number;
    vod_copyright: number;
    vod_points: number;
    vod_points_play: number;
    vod_points_down: number;
    vod_hits: number;
    vod_hits_day: number;
    vod_hits_week: number;
    vod_hits_month: number;
    vod_duration: string;
    vod_up: number;
    vod_down: number;
    vod_score: string;
    vod_score_all: number;
    vod_score_num: number;
    vod_time: string;
    vod_time_add: number;
    vod_time_hits: number;
    vod_time_make: number;
    vod_trysee: number;
    vod_douban_id: number;
    vod_douban_score: string;
    vod_reurl: string;
    vod_rel_vod: string;
    vod_rel_art: string;
    vod_pwd: string;
    vod_pwd_url: string;
    vod_pwd_play: string;
    vod_pwd_play_url: string;
    vod_pwd_down: string;
    vod_pwd_down_url: string;
    vod_content: string; //HTML 简介
    vod_play_from: string; // 资源来源
    vod_play_server: string; // 是否服务器
    vod_play_note: string; // 播放备注
    vod_play_url: string; // 播放URL
    vod_down_from: string; 
    vod_down_server: string; 
    vod_down_note: string;
    vod_down_url: string;
    vod_plot: number;
    vod_plot_name: string; 
    vod_plot_detail: string;
    type_name: string;

}

