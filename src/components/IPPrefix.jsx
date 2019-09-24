/*
 * Copyright 2019 SURF.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *         http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

import React from "react";
import Select from "react-select";
import PropTypes from "prop-types";

import { ip_blocks, prefix_filters } from "../api";

import "./IPPrefix.scss";
import I18n from "i18n-js";
import { stop } from "../utils/Utils";
import { ipamStates } from "../utils/Lookups";
import SplitPrefix from "./SplitPrefix";

export default class IPPrefix extends React.PureComponent {
    constructor(props, context) {
        super(props, context);
        this.state = {
            actions: { show: false, id: "" },
            isValid: true,
            ipBlocks: [],
            loading: true,
            filteredIpBlocks: [],
            filter_prefixes: [],
            filter: {
                state: [
                    ipamStates.indexOf("Free"),
                    ipamStates.indexOf("Allocated"),
                    ipamStates.indexOf("Planned"),
                    ipamStates.indexOf("Subnet")
                ],
                prefix: { id: 0 }
            },
            sorted: {
                name: "index",
                descending: false
            },
            selected_prefix_id: null,
            selected_prefix: "0/0",
            selected_prefix_state: 0, // decides the range of netmask selection in the SplitPrefix component
            ipam_prefix: ""
        };
    }

    componentDidMount() {
        const { preselectedPrefix } = this.props;
        if (preselectedPrefix) {
            this.setState({ loading: false });
            this.props.onChange(preselectedPrefix);
        } else {
            prefix_filters().then(result => {
                let { filter } = this.state;
                filter["prefix"] = result[0];
                this.setState({
                    filter_prefixes: result,
                    filter: filter,
                    filteredIpBlocks: this.filterAndSortBlocks()
                });
            });
            ip_blocks(1).then(result => {
                this.setState({ ipBlocks: result, loading: false });
            });
        }
    }

    sort = name => e => {
        stop(e);
        const sorted = { ...this.state.sorted };

        sorted.descending = sorted.name === name ? !sorted.descending : false;
        sorted.name = name;
        this.setState({
            sorted: sorted,
            filteredIpBlocks: this.filterAndSortBlocks()
        });
    };

    sortBy = name => (a, b) => {
        if (name === "prefix") {
            name = "index";
        }
        const aVal = a[name];
        const bVal = b[name];
        try {
            return typeof aVal === "string" && typeof bVal === "string"
                ? aVal.toLowerCase().localeCompare(bVal.toLowerCase())
                : aVal - bVal;
        } catch (e) {
            console.log(e);
        }
    };

    sortColumnIcon = (name, sorted) => {
        if (sorted.name === name) {
            return <i className={sorted.descending ? "fa fa-sort-desc" : "fa fa-sort-asc"} />;
        }
        return <i />;
    };

    filterState = e => {
        const state_filter = parseInt(e.target.value, 10);
        let { filter } = this.state;
        if (e.target.checked) {
            filter["state"].push(state_filter);
        } else {
            filter["state"] = filter["state"].filter(e => e !== state_filter);
        }
        this.setState({
            filter: filter,
            filteredIpBlocks: this.filterAndSortBlocks()
        });
    };

    filterParentPrefix = e => {
        const parentPrefix = parseInt(e.value, 10);
        let { filter, filter_prefixes } = this.state;
        let the_prefix = {};
        filter_prefixes.forEach(prefix => (the_prefix = prefix["id"] === parentPrefix ? prefix : the_prefix));
        filter["prefix"] = the_prefix;
        ip_blocks(parentPrefix).then(result => {
            this.setState({
                ipBlocks: result,
                filteredIpBlocks: this.filterAndSortBlocks(),
                loading: false,
                filter: filter
            });
        });
    };

    filterAndSortBlocks() {
        const { filter, sorted, ipBlocks } = this.state;
        let filteredIpBlocks = ipBlocks;
        Object.keys(filter).map((key, index) => {
            if (key === "state") {
                filteredIpBlocks = filteredIpBlocks.filter(i => filter[key].includes(i[key]));
            } else if (key === "prefix" && !(filter["prefix"]["id"] === 0)) {
                filteredIpBlocks = filteredIpBlocks.filter(i => i["parent"] === filter["prefix"]["id"]);
            } else if (key !== "prefix") {
                filteredIpBlocks = filteredIpBlocks.filter(i => i[key] === filter[key]);
            }
            return key;
        });
        filteredIpBlocks.sort(this.sortBy(sorted.name));
        return sorted.descending ? filteredIpBlocks.reverse() : filteredIpBlocks;
    }

    selectPrefix = prefix => () => {
        if (prefix.state === 0 || prefix.state === 1) {
            this.setState({
                selected_prefix_id: prefix["id"],
                selected_prefix: prefix["prefix"],
                selected_prefix_state: prefix.state
            });
            this.props.onChange(prefix["prefix"]);
        }
    };

    selectIpam = prefix => {
        this.setState({ ipam_prefix: prefix, isValid: true });
        this.props.onChange(prefix);
    };

    renderContent(ipBlocks, loading) {
        const columns = ["id", "prefix", "description", "state_repr"];
        const { sorted, filter_prefixes, selected_prefix_id, selected_prefix, selected_prefix_state } = this.state;
        const { state, prefix } = { ...this.state.filter };
        let parentPrefix = prefix["id"];
        const [subnet, netmask] = selected_prefix.split("/");
        let prefix_min = parseInt(netmask, 10) + (selected_prefix_state === 0 ? 0 : 1);
        const th = index => {
            const name = columns[index];
            return (
                <th key={index} className={name} onClick={this.sort(name)}>
                    <span>{I18n.t(`metadata.ipBlocks.${name}`)}</span> {this.sortColumnIcon(name, sorted)}
                </th>
            );
        };
        const options = filter_prefixes.map(fp => ({
            value: fp["id"],
            label: fp["prefix"]
        }));
        const value = options.find(option => option.value === parentPrefix);

        return (
            <div>
                <div>
                    <h3>Selected prefix: {selected_prefix}</h3>
                </div>
                <div>
                    <span>State:</span>
                    <span>
                        <input
                            type="checkbox"
                            name="state"
                            onChange={this.filterState}
                            value={ipamStates.indexOf("Allocated")}
                            checked={state.includes(ipamStates.indexOf("Allocated"))}
                        />
                        Permanent toegewezen
                    </span>
                    <span>
                        <input
                            type="checkbox"
                            name="state"
                            onChange={this.filterState}
                            value={ipamStates.indexOf("Planned")}
                            checked={state.includes(ipamStates.indexOf("Planned"))}
                        />
                        Gereserveerd
                    </span>
                    <span>
                        <input
                            type="checkbox"
                            name="state"
                            onChange={this.filterState}
                            value={ipamStates.indexOf("Free")}
                            checked={state.includes(ipamStates.indexOf("Free"))}
                        />
                        Vrij
                    </span>
                </div>
                <div>
                    <span>Root filter</span>
                    <span>
                        <Select options={options} onChange={this.filterParentPrefix} value={value} />
                    </span>
                </div>
                <table className="ip-blocks">
                    <thead>
                        <tr>{columns.map((column, index) => th(index))}</tr>
                    </thead>
                    {ipBlocks.length > 0 && (
                        <tbody>
                            {ipBlocks.map((ipBlock, index) => {
                                let selected = ipBlock["id"] === selected_prefix_id;
                                return (
                                    <tr
                                        key={`${ipBlock["id"]}_${index}`}
                                        onClick={this.selectPrefix(ipBlock)}
                                        className={ipamStates[ipBlock["state"]] + (selected ? " selected" : "")}
                                    >
                                        {columns.map((column, tdIndex) => (
                                            <td
                                                key={`${ipBlock["id"]}_${index}_${tdIndex}`}
                                                data-label={column}
                                                className={column}
                                            >
                                                {ipBlock[column]}
                                            </td>
                                        ))}
                                    </tr>
                                );
                            })}
                        </tbody>
                    )}
                </table>
                {selected_prefix_id && (
                    <SplitPrefix
                        subnet={subnet}
                        netmask={netmask}
                        prefixlen={parseInt(netmask, 10)}
                        prefix_min={prefix_min}
                        onChange={this.selectIpam}
                    />
                )}
            </div>
        );
    }

    renderContentWithPreselectedPrefix = (preselectedPrefix, prefix_min) => {
        const [subnet, netmask] = preselectedPrefix.split("/");
        return (
            <section className="ipblock-selector">
                <div>
                    <SplitPrefix
                        subnet={subnet}
                        netmask={netmask}
                        prefixlen={parseInt(netmask, 10)}
                        prefix_min={prefix_min}
                        onChange={this.selectIpam}
                    />
                </div>
            </section>
        );
    };

    render() {
        const { preselectedPrefix, prefix_min } = this.props;
        if (prefix_min) {
            return this.renderContentWithPreselectedPrefix(preselectedPrefix, prefix_min);
        } else {
            const { loading, selected_prefix_id } = this.state;
            let filteredIpBlocks = this.filterAndSortBlocks();
            return (
                <section className="ipblock-selector">
                    <div className="selected_value">{selected_prefix_id}</div>
                    {this.renderContent(filteredIpBlocks, loading)}
                </section>
            );
        }
    }
}

IPPrefix.propTypes = {
    preselectedPrefix: PropTypes.string,
    prefix_min: PropTypes.number,
    onChange: PropTypes.func.isRequired
};
