import Mn from 'backbone.marionette';
import application from '../application';
import { timeToString } from '../libs/utils';


const Player = Mn.LayoutView.extend({

    template: require('./templates/player'),

    ui: {
        player: 'audio',
        currentTime: '#current-time',
        totalTime: '#total-time',
        progress: '#progress',
        progressBar: '#progress-bar',
        volume: '#volume',
        volumeBar: '#volume-bar',
        playButton: '#play',
        trackname: '#trackname',
        shuffle: '#shuffle',
        repeat: '#repeat',
        speaker: '#speaker'
    },

    events: {
        'click #prev': 'prev',
        'click #play': 'toggle',
        'click #next': 'next',
        'mousedown @ui.progressBar': 'skip',
        'mousedown @ui.volumeBar': 'changeVol',
        'click @ui.shuffle': 'toggleShuffle',
        'click @ui.repeat': 'toggleRepeat',
        'click @ui.speaker': 'toggleVolume'
    },

    initialize() {
        this.listenTo(application.channel,'reset:UpNext', this.render);
        this.listenTo(application.channel, 'player:next', this.next)
        this.listenTo(application.appState, 'change:currentTrack',
            function(appState, currentTrack) {
                if (currentTrack) {
                    this.load(currentTrack);
                }
        });
        $(document).keyup((e) => {
             e.preventDefault();
            switch (e.key) {
                case ' ':
                    this.toggle();
                    break;
                case 'ArrowRight':
                    this.next();
                    break;
                case 'ArrowLeft':
                    this.prev();
                    break;
                case 'ArrowUp':
                    // increaseVol
                    break;
                case 'ArrowDown':
                    // decreaseVol
                    break;
                case 'm':
                    // mute
                    break;
            }
        });
        $(document).mousemove((e) => {
            if (this.volumeDown) {
                this.changeVol(e);
            } else if (this.progressDown) {
                this.skip(e);
            }
        });
        $(document).mouseup((e) => {
            this.volumeDown = false;
            this.progressDown = false;
        });
    },

    onRender() {
        let audio = this.ui.player.get(0);
        audio.ontimeupdate = this.onTimeUpdate;
        audio.onended = () => { this.next() };
        audio.onvolumechange = this.onVolumeChange;
        audio.volume = application.appState.get('currentVolume');
    },

    load(track) {
        let title = track.get('metas').title;
        let artist = track.get('metas').artist;
        let text;
        if (artist) {
            text = artist + ' - ' + title;
        } else {
            text = title;
        }
        this.ui.trackname.text(text);
        let self = this;
        track.getStream(function(url) {
            self.play(url);
        });
    },

    play(url) {
        let audio = this.ui.player.get(0);
        audio.src = url;
        audio.load();
        audio.play();
        this.ui.playButton.find('use').attr(
            'xlink:href',
            require('../assets/icons/pause-lg.svg')
        );
    },

    toggle() {
        let audio = this.ui.player.get(0);
        if (audio.paused && audio.src) {
            audio.play();
            this.ui.playButton.find('use').attr(
                'xlink:href',
                require('../assets/icons/pause-lg.svg')
            );
        } else if (audio.src) {
            audio.pause();
            this.ui.playButton.find('use').attr(
                'xlink:href',
                require('../assets/icons/play-lg.svg')
            );
        }
    },

    prev() {
        let upNext = application.upNext.get('tracks');
        let currentTrack = application.appState.get('currentTrack');
        let index = upNext.indexOf(currentTrack) - 1;
        let prev = upNext.at(index)
        if (prev && index > -1) {
            application.appState.set('currentTrack', prev);
        } else {
            this.replayCurrent();
        }
    },

    next() {
        let repeat = application.appState.get('repeat');
        let upNext = application.upNext.get('tracks');
        let currentTrack = application.appState.get('currentTrack');
        let index = upNext.indexOf(currentTrack) + 1;
        let next = upNext.at(index)
        if (repeat == 'track') {
            this.replayCurrent();
        } else if (next) {
            application.appState.set('currentTrack', next);
        } else if (repeat == 'playlist' && upNext.at(0)) {
            if (upNext.length == 1) {
                this.replayCurrent();
            }
            application.appState.set('currentTrack', upNext.at(0));
        } else {
            application.appState.set('currentTrack', undefined);
            this.render();
        }
    },

    replayCurrent() {
        let audio = this.ui.player.get(0);
        audio.currentTime = 0;
        audio.play();
        this.ui.playButton.find('use').attr(
            'xlink:href',
            require('../assets/icons/pause-lg.svg')
        );
    },

    toggleShuffle() {
        let shuffle = application.appState.get('shuffle');
        application.appState.set('shuffle', !shuffle);
        $('#shuffle-sm').toggleClass('active', !shuffle);
    },

    toggleRepeat() {
        let repeat = application.appState.get('repeat');
        switch (repeat) {
            case 'false':
                application.appState.set('repeat', 'track');
                $('#repeat-sm').toggleClass('active', true);
                this.ui.repeat.find('use').attr(
                    'xlink:href',
                    require('../assets/icons/repeat-one-sm.svg')
                );
                break;
            case 'track':
                application.appState.set('repeat', 'playlist');
                this.ui.repeat.find('use').attr(
                    'xlink:href',
                    require('../assets/icons/repeat-sm.svg')
                );
                break;
            case 'playlist':
                application.appState.set('repeat', 'false');
                $('#repeat-sm').toggleClass('active', false);
                break;
        }
    },

    toggleVolume() {
        let audio = this.ui.player.get(0);
        let mute = application.appState.get('mute');
        application.appState.set('mute', !mute);
        if (!mute) {
            this.ui.speaker.find('use').attr(
                'xlink:href',
                require('../assets/icons/mute-sm.svg')
            );
            audio.volume = 0;
        } else {
            this.ui.speaker.find('use').attr(
                'xlink:href',
                require('../assets/icons/speaker-sm.svg')
            );
            audio.volume = application.appState.get('currentVolume');
        }

    },

    // Go to a certain time in the track
    skip(e) {
        this.progressDown = true;
        let audio = this.ui.player.get(0);
        let bar = this.ui.progressBar.get(0);
        let newTime = audio.duration * ((e.pageX - bar.offsetLeft) / bar.clientWidth);
        audio.currentTime = newTime;
    },

    // Change the time displayed
    onTimeUpdate() {
        let player = application.appLayout.getRegion('player').currentView;
        let audio = player.ui.player.get(0);
        player.ui.currentTime.html(timeToString(audio.currentTime));
        player.ui.totalTime.html(timeToString(audio.duration));
        let percent = audio.currentTime / audio.duration * 100 + '%';
        player.ui.progress.width(percent);
    },

    // Change the volume displayed
    onVolumeChange() {
        let player = application.appLayout.getRegion('player').currentView;
        let audio = player.ui.player.get(0);
        let bar = player.ui.volumeBar.get(0);
        let percent = audio.volume * 100 + '%';
        player.ui.volume.width(percent);
    },

    // Change the volume
    changeVol(e) {
        this.volumeDown = true;
        let audio = this.ui.player.get(0);
        let bar = this.ui.volumeBar.get(0);
        let volume = (e.pageX - bar.offsetLeft) / bar.clientWidth;
        audio.volume = volume;
        application.appState.set('currentVolume', volume);
    }
});

export default Player;
