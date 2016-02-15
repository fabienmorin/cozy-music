import Backbone from 'backbone'

const Track = Backbone.Model.extend({
    defaults: {
        id: '',
        playlists: '',
        metas: '',
        dateAdded: Date.now,
        plays: 0,
        ressource: ''
    },
    sync: (method, model, options) => {
        switch (method) {
            case 'create':
                cozysdk.create('Track', model, (error, response) => {
                    console.log(error, response);
                });
                break;
            case 'read':
                cozysdk.find('Track', model.id, (error, response) => {
                    console.log(error, response);
                 });
                break;
            case 'update':
                cozysdk.updateAttributes(
                    'Track', model.id, model, (error, response) => {
                    console.log(error, response);
                });
                break;
            case 'delete':
                cozysdk.destroy('Track', model.id, (error, response) => {
                    console.log(error, response);
                });
                break;
        }
    }
});


export default Track;
