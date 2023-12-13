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
            readableData: null,
            errorMessage: '',
            depth: 1,
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
            render: false,
            otp: '',
        }
    },
    // components: {
    //     "vue-json-pretty": window.VueJsonPretty
    // },
    mounted() {
        this.$refs.prettyCode.codemirror.setSize(null, "60em");
    },
    methods: {
        fetchData() {
            this.readableData = null;
            fetch(`/read?userId=${this.userId}`)
                .then(async response => {
                    if (!response.ok) {
                        var err = await response.text();
                        throw new Error(err || 'Server error');
                    }
                    return await response.json();
                })
                .then(async data => {
                    if (data.data) {
                        this.showToast('Ok', 'is-success');
                        this.readableData = JSON.parse(data.data);
                        if (this.foldOnQuery)
                            this.$nextTick(async () => {
                                let cm = this.$refs.prettyCode.codemirror;
                                await this.foldToLevel(1);
                                this.$nextTick(() => {
                                    for(var i = 2; i < 5; i++)
                                        this.foldToLevel(i);
                                })
                                // CodeMirror.commands.foldAll(cm);
                            });
                    } else {
                        throw new Error('Invalid data format');
                    }
                })
                .catch(error => {
                    console.error('Error fetching data:');
                    console.log(error);
                    this.readableData = null;
                    this.showToast(error.message, 'is-danger'); // Show error toast
                });
        },
        updateData() {
            fetch('/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: this.userId, newData: JSON.stringify(this.readableData), totp: this.otp })
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
                    this.showToast('Ok', 'is-success');
                    this.readableData = JSON.parse(data.data);
                } else {
                    throw new Error('Invalid data format');
                }
            })
            .catch(error => {
                console.error('Error updating data:', error);
                this.showToast(error.message, 'is-danger'); // Show error toast
            });
        },
        showToast(message, type) {
            this.$buefy.toast.open({
                duration: 5000,
                message: message,
                type: type // Type of toast, 'is-danger' for errors
            });
        },
        Stringify_WithSpaces(obj) {
            let result = JSON.stringify(obj, null, 1); // stringify, with line-breaks and indents
            result = result.replace(/^ +/gm, " "); // remove all but the first space for each line
            result = result.replace(/\n/g, ""); // remove line-breaks
            result = result.replace(/{ /g, "{").replace(/ }/g, "}"); // remove spaces between object-braces and first/last props
            result = result.replace(/\[ /g, "[").replace(/ \]/g, "]"); // remove spaces between array-brackets and first/last items
            return result;
        },
        async foldToLevel(level) {
            let cm = this.$refs.prettyCode.codemirror;
            cm.eachLine((line) => {
                let lineNumber = line.lineNo();
                let lineText = cm.getLine(lineNumber);
                let indentLevel = this.getIndentLevel(lineText);
                
                if (indentLevel === level) {
                    cm.foldCode({line: lineNumber, ch: 0}, null, 'fold');
                }
            });
        },
        getIndentLevel(lineText) {
            let cm = this.$refs.prettyCode.codemirror;
            let indentSize = cm.getOption("indentUnit");
            let indentLevel = 0;
            for (let i = 0; i < lineText.length; i++) {
                if (lineText[i] === " ") {
                    indentLevel += 1;
                } else {
                    break;
                }
            }
            return Math.floor(indentLevel / indentSize);
        },
        openSearch() {
            let cm = this.$refs.prettyCode.codemirror;
            cm.execCommand("find");
        },
    },
    computed: {
        rawJson() { return JSON.stringify(this.readableData) },
        prettyJson: {
            get() {
                try {
                    return JSON.stringify(this.readableData, null, 2);
                } catch (e) {
                    return "";
                }
            },
            set(newValue) {
                this.readableData = JSON.parse(newValue);
            },
        },
        foldOnQuery: {
            get() {
                if (localStorage.getItem('foldOnQuery') == undefined) {
                    return true;
                }
                // Retrieve data from localStorage
                return localStorage.getItem('foldOnQuery') === 'true';
            },
            set(value) {
                // Save data to localStorage
                localStorage.setItem('foldOnQuery', value);
            }
          }
    },
});