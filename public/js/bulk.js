Vue.use(Buefy);
Vue.component('vue-json-pretty', VueJsonPretty.default);
Vue.use(window.VueCodemirror)
new Vue({
    el: '#app',
    data() {
        var self = this;
        return{
            rawOpen: false,
            userId: '',
            readableData: '',
            errorMessage: '',
            depth: 1,
            validationCode: 'return false;',
            edittingCode: 'return userData;',
            cmOption: {
                tabSize: 2,
                styleActiveLine: true,
                lineNumbers: true,
                mode: 'text/javascript',
                theme: "monokai",
                lineWrapping: true,
                extraKeys: {
                    "Ctrl-Q": function(cm){ cm.foldCode(cm.getCursor()); },
                    "Shift-Ctrl-Q": function(cm) { 
                        self.foldToLevel(1);
                        self.foldToLevel(2);
                        self.foldToLevel(3);
                        self.foldToLevel(4);
                        self.foldToLevel(5);
                    },
                    "Ctrl-F": function(cm) { cm.execCommand("find") }
                },
                foldGutter: true,
                gutters: ["CodeMirror-linenumbers", "CodeMirror-foldgutter"],
            },
            diffCmOptions: {
                tabSize: 2,
                styleActiveLine: true,
                lineNumbers: true,
                mode: 'text/javascript',
                theme: "monokai",
                lineWrapping: true,
                extraKeys: {
                    "Ctrl-Q": function(cm){ cm.foldCode(cm.getCursor()); },
                    "Shift-Ctrl-Q": function(cm) { 
                        self.foldToLevel(1);
                        self.foldToLevel(2);
                        self.foldToLevel(3);
                        self.foldToLevel(4);
                        self.foldToLevel(5);
                    },
                    "Ctrl-F": function(cm) { cm.execCommand("find") }
                },
                foldGutter: true,
                gutters: ["CodeMirror-linenumbers", "CodeMirror-foldgutter"],
                highlightDifferences: true,
                connect: 'align',
                collapseIdentical: true,
                origLeft: '',
                value: ''
            },
            dataToUpdate: {},
            otp: '',
            forceupdatetrigger: 1,
            selected: 0,
            selectedData: {},
            diffKey: 0,
        }
    },
    methods: {
        showToast(message, type) {
            this.$buefy.toast.open({
                duration: 1000,
                message: message,
                type: type // Type of toast, 'is-danger' for errors
            });
        },
        selectUser(userId) {
            this.selected = userId;
            this.selectedData = this.dataToUpdate.filter(item => item.userData.UserID == userId)[0];
            
            if (_.isEqual(this.selectedData.userData, this.selectedData.edittedUserData)){
                return;
            }

            this.diffCmOptions.origLeft = JSON.stringify(this.selectedData.userData, null, 2);
            this.diffCmOptions.value = JSON.stringify(this.selectedData.edittedUserData, null, 2);
            this.diffKey++;

            // this.$nextTick(() => mergeView.setSize(null, "40em"), 100);

        },
        async fetchData(userId) {
            // this.readableData = '';
            this.dataToUpdate = null;
            return await fetch(`/read?userId=${userId}`)
                .then(async response => {
                    if (!response.ok) {
                        var err = await response.text();
                        throw new Error(err || 'Server error');
                    }
                    return await response.json();
                })
                .then(async data => {
                    if (data.data) {
                        // this.showToast('Ok', 'is-success');
                        return JSON.parse(data.data)
                    } else {
                        throw new Error('Invalid data format');
                    }
                })
                .catch(error => {
                    console.error('Error fetching data:');
                    console.log(error);
                    // this.readableData = '';
                    this.showToast(error.message, 'is-danger'); // Show error toast
                    return null;
                });
        },
        async fetchAllData() {
            // this.readableData = '';
            return await fetch(`/readAll`)
                .then(async response => {
                    if (!response.ok) {
                        var err = await response.text();
                        throw new Error(err || 'Server error');
                    }
                    return await response.json();
                })
                .then(async data => {
                    if (data.data) {
                        // this.showToast('Ok', 'is-success');
                        return JSON.parse(data.data)
                    } else {
                        throw new Error('Invalid data format');
                    }
                })
                .catch(error => {
                    console.error('Error fetching data:');
                    console.log(error);
                    // this.readableData = '';
                    this.showToast(error.message, 'is-danger'); // Show error toast
                    return null;
                });
        },
        async updateData(item) {
            userId = item.userData.UserID
            data = JSON.stringify(item.edittedUserData)
            return await fetch('/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: userId, newData: data, totp: this.otp })
            })
                .then(async response => {
                    if (!response.ok) {
                        var err = await response.text();
                        throw new Error(err || 'Server error');
                    }
                    return await response.json();
                })
                .then(data => {
                    if (data.data) {
                        // this.showToast('Ok', 'is-success');
                        item.updatedData = JSON.parse(data.data);
                        // this.readableData = data.data;
                        item.updated = true;
                    } else {
                        throw new Error('Invalid data format');
                    }
                })
                .catch(error => {
                    console.error('Error updating data:', error);
                    item.updated = false;
                    throw error
                });
        },
        async fetchDataToUpdate() {
            var userIds;
            var validationFunction;
            var edittingFunction;
            var userDatas;
            
            // if (userIds != "" && userIds != undefined){
                try {
                    userIds = this.userId.split(',').map(element => parseInt(element.trim()));
                    validationFunction = Function('userData', this.storedValidationCode);
                    edittingFunction = Function('userData', this.storedEdittingCode);
                } catch (err) {
                    this.showToast(err);
                    return;
                }
            
                userDatas = await Promise.all(userIds.map(async id => { 
                    return await this.fetchData(id)
                }));
            // }
            // else {
            //     userdatas = await this.fetchAllData();
            // }

            this.dataToUpdate = userDatas.map(userData => {
                return {
                    userData: userData,
                    validated: validationFunction(userData),
                    edittedUserData: validationFunction(userData) 
                        ? edittingFunction(structuredClone(userData)) 
                        : userData,
                    success: false,
                    updated: false,
                    showDiff: false,
                }
            })
            
            console.log(this.dataToUpdate);
        },
        async commitData() {
            var error;
            var result = this.dataToUpdate.map(async item => {
                try {
                    if (item.validated) await this.updateData(item)
                    item.updated = true;
                }
                catch (err) {
                    item.updated = false;
                    error = err;
                }
            });

            await Promise.all(result);
            this.dataToUpdate.forEach(item => {
                console.log(item)
                if (item.updated == true && JSON.stringify(item.edittedUserData) == JSON.stringify(item.updatedData)) {
                    item.success = true;
                }
            });
            if (this.dataToUpdate.filter(item => item.success == false).length > 0) 
                this.showToast(error, "is-danger")
            else
                this.showToast("Success", "is-success")
        },
        makeDiffOptions(data) {
            var newCmOptions = structuredClone(this.cmOption);
            newCmOptions.value = JSON.stringify(data.edittedUserData, null, 2);
            newCmOptions.origLeft = JSON.stringify(data.userData, null, 2);
            newCmOptions.highlightDifferences = true;
            newCmOptions.connect = 'align';
            newCmOptions.collapseIdentical = true;
            return newCmOptions;
        }
    },
    mounted() {
        if (localStorage.getItem('validationCode') != undefined) {
            this.validationCode = localStorage.getItem('validationCode');
        }
        if (localStorage.getItem('edittingCode') != undefined) {
            this.edittingCode = localStorage.getItem('edittingCode');
        }
    }, 
    computed: {
        storedValidationCode: {
            get() {
                return this.validationCode;
            },
            set(value) {
                this.validationCode = value;
                localStorage.setItem('validationCode', value);
            }
        },
        storedEdittingCode: {
            get() {
                return this.edittingCode;
            },
            set(value) {
                this.edittingCode = value;
                localStorage.setItem('edittingCode', value);
            }
        }
    }
});