<template>
    <div id="app" v-cloak>
        <div class="tabs">
            <i-button :type="buttonType[0]" style="margin-right: 50px" @click="tabSwitch(1)">视频检索</i-button>
            <i-button :type="buttonType[1]" @click="tabSwitch(2)">视频检查</i-button>
            <i-button v-if="tab===2" type="primary" @click="getUploadList()" class="upload">查看上传</i-button>
            <i-button v-if="tab===2" type="primary" @click="modal = true" class="set">设置</i-button>
        </div>
        <div class="head">
            <p v-if="tab===1">
                <span class="name">会议ID：</span>
                <i-input v-model="callId" placeholder="请输入会议ID" style="width:180px" />
            </p>
            <p v-if="tab===1">
                <span class="name">坐席ID：</span>
                <i-select
                    filterable
                    multiple
                    v-model="agentID"
                    placeholder="请输入坐席ID"
                    style="width:200px;height:32px;overflow:hidden"
                >
                    <i-option v-for="(value) in agentIDList" :value="value" :key="value">{{value}}</i-option>
                </i-select>
            </p>
            <p>
                <span class="name">时间选择：</span>
                <Date-picker
                    type="datetimerange"
                    placement="bottom-end"
                    placeholder="请选择日期"
                    style="width:280px"
                    v-model="date"
                    @on-change="dateChange"
                    format="yyyy-MM-dd HH:mm:ss"
                ></Date-picker>
            </p>
            <p v-if="tab===2">
                <span class="name">检查情况：</span>
                <i-select clearable v-model="condition" placeholder="请输入业务类型" style="width:180px">
                    <i-option value="0">正常</i-option>
                    <i-option value="-1">异常</i-option>
                    <i-option value="1">缺失</i-option>
                </i-select>
            </p>
            <p>
                <span class="name">业务类型：</span>
                <i-input v-model="BusinessType" placeholder="请输入业务类型" style="width:180px" />
            </p>
            <i-button type="primary" @click="query">查询</i-button>
            <i-button v-if="tab===2" type="primary" @click="upModal = true">上传</i-button>
        </div>
        <div class="tableContainer">
            <i-table
                :height="tab===1?tableHeight:tableVideoCheckHeight"
                :data="tab===1?tableData:tableVideoCheckData"
                :columns="tab===1?searchColumns:checkColumns"
                stripe
            >
                <template slot-scope="{ row, index }" slot="action">
                    <i-button
                        type="primary"
                        size="small"
                        style="margin-right: 5px"
                        @click="download(index)"
                    >下载</i-button>
                    <i-button type="error" size="small" @click="play(index)">播放</i-button>
                </template>
                <template slot-scope="{ row, index }" slot="reasonResult">
                    <span v-if="row.reasonResult==='正常'">{{ row.reasonResult }}</span>
                    <span
                        v-else
                        style="color:red;cursor:pointer"
                        @click="abnormalOperate(index,row)"
                    >{{ row.reasonResult }}</span>
                </template>
            </i-table>
            <div style="margin: 10px;overflow: hidden">
                <div style="float: right;">
                    <page
                        id="page"
                        :current="pageCount+1"
                        :total="tab===1?tableDataCount:total"
                        :page-size="pageSize"
                        @on-change="changePage"
                        @on-page-size-change="changePageSize"
                        :page-size-opts="[10,20,50,100]"
                        show-sizer
                        show-total
                        show-elevator
                        style="float: left;"
                    ></page>
                    <i-button
                        style="float:left;margin-left: 10px;"
                        type="primary"
                        @click="goElevatorPage"
                    >跳转</i-button>
                </div>
            </div>
        </div>
        <div v-if="tab===2" class="statistics">
            <label>
                业务视频ID总量：
                <span>{{total}}</span>
            </label>
            <label>
                检索视频ID总量：
                <span>{{videoTotal}}</span>
            </label>
            <label>
                异常视频数：
                <span>{{totalAbnormal}}</span>
            </label>
        </div>
        <!--播放功能-->
        <div v-if="playSwitch" class="play">
            <video ref="video" :src="playUrl" controls autoplay></video>
            <Icon
                type="md-close-circle"
                class="icon"
                size="32"
                color="#fff"
                style="margin-top:-250px; 
            margin-left:450px"
                @click="closePlay"
            ></Icon>
            <Icon
                type="ios-fastforward"
                class="icon"
                size="32"
                color="#fff"
                style="margin-top:250px; 
            margin-left:40px"
                @click="forward"
            ></Icon>
            <Icon
                type="ios-rewind"
                class="icon"
                size="32"
                color="#fff"
                style="margin-top:250px; 
            margin-left:-60px"
                @click="backward"
            ></Icon>
        </div>
        <!--弹窗-设置时长阀值-->
        <Modal v-model="modal" width="400" @on-ok="ok" @on-cancel="cancel" :mask-closable="false">
            <p slot="header" style="color:#2d8cf0">
                <span>设置正常视频时长阀值</span>
            </p>
            <div style="padding-left:40px">
                <p style="display:inline-block">视频时长：</p>
                <input-number v-model="videoDuration" style="width:180px" />
            </div>
        </Modal>
        <!-- 上传弹窗 -->
        <Modal
            v-model="upModal"
            width="500"
            @on-ok="upModal = false"
            @on-cancel="upModal = false"
            :mask-closable="false"
        >
            <p slot="header" style="color:#2d8cf0">
                <span>请添加上传文件</span>
            </p>
            <upload v-if="tab===2" multiple type="drag" action="/media/uploadfile">
                <div style="padding: 20px 0">
                    <Icon type="ios-cloud-upload" size="52" style="color: #3399ff"></Icon>
                    <p>点击或拖拽上传的文件</p>
                </div>
            </upload>
        </Modal>
        <!-- 上传列表弹窗 -->
        <Drawer :width="600" title="已上传文件" :closable="false" v-model="drawer">
            <Table stripe :columns="uploadListColumn" :data="uploadList" />
        </Drawer>
    </div>
</template>

<script>
export default {
    name: "App",
    data() {
        return {
            tab: 1, //tab选择
            buttonType: ["primary", "default"],
            modal: false, //对话框显示关闭
            upModal: false, // 上传弹窗
            drawer: false, // 上传列表抽屉
            videoDuration: 30, //视频时长
            duration: 30,
            callId: "",
            agentID: [],
            agentIDList: [],
            date: [], //日期
            dateRange: [],
            condition: "", //检查情况
            BusinessType: "", //业务类型
            palyID: "", //播放/下载ID
            playSwitch: false, //播放开关
            playUrl: "", //播放地址
            tableDataCount: 0, //表格数据统计
            total: 0, //业务视频ID总量
            videoTotal: 0, //检索视频ID总量
            totalAbnormal: 0, //检索视频ID总量
            tableHeight: 88, //表格高度
            tableVideoCheckHeight: 88,
            pageCount: 0, //表格当前页
            pageSize: 10, //表格每页显示数量
            searchColumns: [
                {
                    title: "会议ID",
                    key: "callId",
                    align: "center"
                },
                {
                    title: "工号",
                    key: "usAgentId",
                    align: "center"
                },
                {
                    title: "开始时间",
                    key: "ulRecFileBeginTime",
                    align: "center"
                },
                {
                    title: "路径",
                    key: "cURLName",
                    align: "center"
                },
                {
                    title: "业务类型",
                    key: "bBankName",
                    align: "center"
                },
                {
                    title: "操作",
                    slot: "action",
                    width: 150,
                    align: "center"
                }
            ],
            checkColumns: [
                {
                    title: "业务视频ID",
                    key: "callId",
                    align: "center"
                },
                {
                    title: "检索视频ID",
                    key: "callId",
                    align: "center"
                },
                {
                    title: "视频时长",
                    key: "videoTimeLeg",
                    align: "center"
                },
                {
                    title: "业务类型",
                    key: "bBankName",
                    align: "center"
                },
                {
                    title: "检查情况",
                    slot: "reasonResult",
                    width: 150,
                    align: "center"
                }
            ],
            tableData: [], //表格数据
            tableVideoCheckData: [], //表格检查数据
            uploadListColumn: [
                // 上传列表表头
                {
                    title: "名称",
                    key: "callid",
                    width: 160,
                },
                {
                    title: "目录",
                    key: "sCBKFileName"
                },
                {
                    title: "时间",
                    key: "sBkUpLoadTime",
                    width: 150
                }
            ],
            uploadList: [] // 上传列表
        };
    },
    created() {
        this.tableColumns = this.searchColumns;
    },
    mounted() {
        this.$axios.get("/media/getAgentList").then(response => {
            if (response.data.result) {
                let list = response.data.data;
                for (let i = 0; i < list.length; i++) {
                    this.$set(this.agentIDList, i, list[i].agentId);
                }
            }
        });
    },
    methods: {
        tabSwitch(index) {
            switch (index) {
                case 1:
                    this.tab = 1;
                    this.buttonType = ["primary", "default"];
                    break;
                case 2:
                    this.tab = 2;
                    this.buttonType = ["default", "primary"];
                    break;
            }
        },
        dateChange(e) {
            e[1] = e[1].replace(" 00:00:00", " 23:59:59");
            this.date = e;
            this.dateRange = e.map(item => item.replace(/-| |:/g, ""));
        },
        //查询按钮功能
        query() {
            console.log(this.agentID);
            this.pageCount = 0; //每次查询默认第一页
            let agent = this.agentID.join(",");
            if (this.condition === "1") {
                this.checkColumns = [
                    {
                        title: "业务视频ID",
                        key: "callId",
                        align: "center"
                    },
                    {
                        title: "坐席ID",
                        key: "usAgentId",
                        align: "center"
                    },
                    {
                        title: "开始时间",
                        key: "ulBeginTime",
                        align: "center"
                    },
                    {
                        title: "检查情况",
                        slot: "reasonResult",
                        width: 150,
                        align: "center"
                    }
                ];
            } else {
                this.checkColumns = [
                    {
                        title: "业务视频ID",
                        key: "callId",
                        align: "center"
                    },
                    {
                        title: "检索视频ID",
                        key: "callId",
                        align: "center"
                    },
                    {
                        title: "视频时长",
                        key: "videoTimeLeg",
                        align: "center"
                    },
                    {
                        title: "业务类型",
                        key: "bBankName",
                        align: "center"
                    },
                    {
                        title: "检查情况",
                        slot: "reasonResult",
                        width: 150,
                        align: "center"
                    }
                ];
            }
            this.queryData(agent);
            this.queryCount(agent);
        },
        //查询表格数据
        queryData(agent) {
            if (this.tab == 1) {
                this.$axios
                    .get("/media/do_query", {
                        params: {
                            begin: this.dateRange[0],
                            end: this.dateRange[1],
                            callId: this.callId,
                            usAgentID: agent,
                            type: this.BusinessType,
                            pageCount: this.pageCount,
                            pageSize: this.pageSize
                        }
                    })
                    .then(response => {
                        console.log(response);
                        if (response.data.result) {
                            this.tableData = [];
                            let dataList = response.data.data.map(item => {
                                for (let key in item) {
                                    if (item[key] == "" || item[key] == null) {
                                        item[key] = "--";
                                    }
                                }
                                return item;
                            });
                            for (let i = 0; i < dataList.length; i++) {
                                this.$set(this.tableData, i, dataList[i]);
                            }
                        }
                    });
            } else {
                this.$axios
                    .get("/media/video_check", {
                        params: {
                            begin: this.dateRange[0],
                            end: this.dateRange[1],
                            inspection: this.condition,
                            type: this.BusinessType,
                            duration: this.duration,
                            pageCount: this.pageCount,
                            pageSize: this.pageSize
                        }
                    })
                    .then(response => {
                        console.log(response);
                        if (response.data.result) {
                            this.tableVideoCheckData = [];
                            let dataList = response.data.data.map(item => {
                                for (let key in item) {
                                    if (item[key] == "" || item[key] == null) {
                                        item[key] = "--";
                                    }
                                }
                                return item;
                            });
                            for (let i = 0; i < dataList.length; i++) {
                                this.$set(
                                    this.tableVideoCheckData,
                                    i,
                                    dataList[i]
                                );
                            }
                        }
                    });
            }
        },
        //查询表格统计量
        queryCount(agent) {
            if (this.tab == 1) {
                this.$axios
                    .get("/media/getCount", {
                        params: {
                            begin: this.dateRange[0],
                            end: this.dateRange[1],
                            callId: this.callId,
                            usAgentID: agent,
                            type: this.BusinessType
                        }
                    })
                    .then(response => {
                        console.log(response);
                        if (response.data.result) {
                            this.tableDataCount = response.data.data;
                            if (
                                this.tableDataCount < this.pageSize &&
                                this.tableDataCount < 10
                            ) {
                                this.tableHeight =
                                    this.tableDataCount * 48 + 40;
                            } else {
                                this.tableHeight = 520;
                            }
                        } else {
                            this.tableHeight = 88;
                        }
                    });
            } else {
                this.$axios
                    .get("/media/getVideoCheckCount", {
                        params: {
                            begin: this.dateRange[0],
                            end: this.dateRange[1],
                            inspection: this.condition,
                            type: this.BusinessType,
                            duration: this.duration
                        }
                    })
                    .then(response => {
                        console.log(response);
                        if (response.data.result) {
                            this.total = response.data.data.total;
                            this.videoTotal = response.data.data.videoTotal;
                            this.totalAbnormal =
                                response.data.data.totalAbnormal;
                            if (this.total < this.pageSize && this.total < 10) {
                                this.tableVideoCheckHeight =
                                    this.total * 48 + 40;
                            } else {
                                this.tableVideoCheckHeight = 520;
                            }
                        } else {
                            this.tableVideoCheckHeight = 88;
                        }
                    });
            }
        },
        ok() {
            this.duration = this.videoDuration;
            this.query();
        },
        cancel() {
            this.videoDuration = this.duration;
        },
        //下载功能
        download(index) {
            this.palyID = this.tableData[index].callId;
            this.$axios
                .get("/media/getUrlName", {
                    params: {
                        callid: this.palyID
                    }
                })
                .then(response => {
                    console.log(response);
                    if (response.data.result) {
                        this.$Message.loading({
                            content: "正在下载中...",
                            duration: 0
                        });
                        this.$axios
                            .get("/media/playVideo", {
                                params: {
                                    callid: this.palyID
                                }
                            })
                            .then(() => {
                                if (process.env.VUE_APP_BASE_API) {
                                    window.location.href =
                                        process.env.VUE_APP_BASE_API +
                                        "/media/playVideo?callid=" +
                                        this.palyID;
                                } else {
                                    window.location.href =
                                        "/media/playVideo?callid=" +
                                        this.palyID;
                                }
                                this.$Message.destroy();
                            });
                    } else {
                        this.$Message.warning("该视频不存在！");
                    }
                });
        },
        //播放功能
        play(index) {
            this.palyID = this.tableData[index].callId;
            this.$axios
                .get("/media/getUrlName", {
                    params: {
                        callid: this.palyID
                    }
                })
                .then(response => {
                    console.log(response);
                    if (response.data.result) {
                        if (process.env.VUE_APP_BASE_API) {
                            this.playUrl =
                                process.env.VUE_APP_BASE_API +
                                "/media/playVideo?callid=" +
                                this.palyID;
                        } else {
                            this.playUrl =
                                "/media/playVideo?callid=" + this.palyID;
                        }
                        this.playSwitch = !this.playSwitch;
                    } else {
                        this.$Message.warning("该视频不存在！");
                    }
                });
        },
        closePlay() {
            this.playSwitch = !this.playSwitch;
        },
        forward() {
            console.log(this.$refs.video.currentTime);
            this.$refs.video.currentTime += 5;
        },
        backward() {
            this.$refs.video.currentTime -= 5;
        },
        changePageSize(size) {
            this.pageSize = size;
            let agent = this.agentID.join(",");
            this.queryData(agent);
        },
        changePage(index) {
            this.pageCount = index - 1;
            let agent = this.agentID.join(",");
            this.queryData(agent);
        },
        //非正常状态操作
        abnormalOperate(index, row) {
            if (row.reasonResult === "异常") {
                // 异常情况
                if (this.tableVideoCheckData[index].checkId == "--") {
                    this.$Message.warning("该检索视频不存在！");
                } else {
                    this.$axios
                        .get("/media/getRetrieveDetails", {
                            params: {
                                checkid: this.tableVideoCheckData[index].callId
                            }
                        })
                        .then(response => {
                            console.log(response);
                            if (response.data.result) {
                                this.$Modal.warning({
                                    title: "异常视频检索明细",
                                    content: response.data.data.reasonResult
                                });
                            } else {
                                this.$Message.warning("该检索视频不存在！");
                            }
                        });
                }
            } else {
                // 缺失情况
                this.palyID = this.tableVideoCheckData[index].callId;
                this.$axios
                    .get("/media/getVideoFailURlName", {
                        params: {
                            callid: this.palyID,
                            begintime: this.tableVideoCheckData[
                                index
                            ].ulBeginTime.replace(/-| |:/g, "")
                        }
                    })
                    .then(response => {
                        console.log(response);
                        if (response.data.result) {
                            this.$Message.loading({
                                content: "正在下载中...",
                                duration: 0
                            });
                            this.$axios
                                .get("/media/getplayRecord", {
                                    params: {
                                        callid: this.palyID,
                                        begintime: this.tableVideoCheckData[
                                            index
                                        ].ulBeginTime.replace(/-| |:/g, "")
                                    }
                                })
                                .then(() => {
                                    if (process.env.VUE_APP_BASE_API) {
                                        window.location.href =
                                            process.env.VUE_APP_BASE_API +
                                            "/media/getplayRecord?callid=" +
                                            this.palyID +
                                            "&begintime=" +
                                            this.tableVideoCheckData[
                                                index
                                            ].ulBeginTime.replace(/-| |:/g, "");
                                    } else {
                                        window.location.href =
                                            "/media/getplayRecord?callid=" +
                                            this.palyID +
                                            "&begintime=" +
                                            this.tableVideoCheckData[
                                                index
                                            ].ulBeginTime.replace(/-| |:/g, "");
                                    }
                                    this.$Message.destroy();
                                });
                        } else {
                            this.$Message.warning("该视频不存在！");
                        }
                    });
            }
        },
        // 获取上传列表
        getUploadList() {
            this.$axios.get("/media/upLoadBKFileList").then(response => {
                if (response.data.result) {
                    this.drawer = true;
                    this.uploadList = response.data.data;
                }
            });
        },
        //跳转按钮-模拟回车键按下
        goElevatorPage() {
            let evtObj;
            let thisPage = document.getElementById("page");
            let elevatorDiv = thisPage.getElementsByClassName(
                "ivu-page-options-elevator"
            );
            if (elevatorDiv && elevatorDiv.length > 0) {
                let pageInput = elevatorDiv[0].getElementsByTagName("input")[0];
                if (window.KeyEvent) {
                    //firefox 浏览器下模拟事件
                    evtObj = document.createEvent("KeyEvents");
                    evtObj.initKeyEvent(
                        "keyup",
                        true,
                        true,
                        window,
                        true,
                        false,
                        false,
                        false,
                        13,
                        0
                    );
                } else {
                    //chrome 浏览器下模拟事件
                    evtObj = document.createEvent("UIEvents");
                    evtObj.initUIEvent("keyup", true, true, window, 1);
                    delete evtObj.keyCode;
                    if (typeof evtObj.keyCode === "undefined") {
                        //为了模拟keycode
                        Object.defineProperty(evtObj, "keyCode", { value: 13 });
                    } else {
                        evtObj.key = String.fromCharCode(13);
                    }
                }
                pageInput.dispatchEvent(evtObj);
            }
        }
    }
};
</script>

<style>
@import "./assets/index.css";
</style>
