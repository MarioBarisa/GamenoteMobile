export const STATUS_CONFIG = {
    playing: {label: "Playing", bg: '#0A84FF', text: '#FFFFFF'},
    paused: {label: "Paused", bg: '#FF9F0A', text: '#FFFFFF'},
    completed: {label: "Completed", bg: '#30D158', text: '#FFFFFF'},
    dropped: {label: "Dropped", bg: '#FF453A', text: '#FFFFFF'},
    backlog: {label: "Backlog", bg: '#b364da', text: '#FFFFFF'},
}

export const STATUS_PLATFORM: Record<string, { label: string; text: string }> = {
    PlayStation: {label: "PlayStation", text: '#2760f4'},
    'PlayStation 5': {label: "PlayStation 5", text: '#2760f4'},
    'PlayStation 4': {label: "PlayStation 4", text: '#2760f4'},

    Xbox: {label: "Xbox", text: '#27f427'},
    'Xbox Series X/S': {label: "Xbox Series X/S", text: '#27f427'},
    'Xbox One': {label: "Xbox One", text: '#27f427'},

    Nintendo: {label: "Nintendo", text: '#eb0e30'},
    'Nintendo Switch': {label: "Nintendo Switch", text: '#eb0e30'},
    'Nintendo Switch 2': {label: "Nintendo Switch 2", text: '#eb0e30'},

    PC: {label: "PC", text: '#0df9e1'},
    iOS: {label: "iOS", text: '#FFFFFF'},
    Android: {label: "Android", text: '#FFFFFF'},
    Other: {label: "Other", text: '#a3a3a3'},
}
