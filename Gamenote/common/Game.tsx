import {SeriesGame} from "@/common/GameSeries";
import {ProgressModeKey} from "@/common/ProgressSources";
import {GameStatus} from  "@/common/StatusCommons"

export interface Game {
  title: string
  platform?: string
  genre?: string
  status?: GameStatus //'playing' | 'paused' | 'completed' | 'dropped' | 'backlog'
  rating?: number
  metacriticScore: number
  ageRating: number
  releaseDate: string
  webPage: string
  about: string
  series?: SeriesGame[];
  notes?: string
  publisher?: string
  image_url?: string[]
  background_image?: string[]
  play_time?: number
  start_date?: string
  end_date?: string
  progress_value?: number
  progress_total?: number
  progress_mode?: ProgressModeKey

}
