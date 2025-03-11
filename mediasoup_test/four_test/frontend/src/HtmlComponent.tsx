const HtmlComponent = () => {
    return (
        <div className="video-chat-container">
            <style>
                {`
          button {
            margin: 2px;
          }
          tr {
            vertical-align: top;
          }
          video {
            width: 360px;
            background-color: black;
            padding: 10px;
            margin: 1px 1px;
          }
          .mainTable {
            width: 100%;
          }
          .localColumn {
            width: 246px;
          }
          .remoteColumn {
            display: flex;
            flex-wrap: wrap;
          }
          #localVideo {
            width: 240px;
          }
          .remoteVideo {
            float: left;
          }
          .videoWrap {
            margin: 3px;
            display: flex;
            justify-content: center;
          }
          @media only screen and (max-width: 1060px) {
            .video {
              width: 300px;
            }
          }
          @media only screen and (max-width: 940px) {
            .video {
              width: 240px;
            }
          }
        `}
            </style>
            <div id="video">
                <table className="mainTable">
                    <tbody>
                        <tr>
                            <td className="localColumn">
                                <video id="localVideo" autoPlay className="video" muted></video>
                            </td>
                            <td className="remoteColumn">
                                <div id="videoContainer"></div>
                            </td>
                        </tr>
                    </tbody>
                </table>
                <table>
                    <tbody>
                        <tr>
                            <td></td>
                        </tr>
                    </tbody>
                </table>
            </div>
            <script src="bundle.js"></script>
        </div>
    );
};

export default HtmlComponent;
