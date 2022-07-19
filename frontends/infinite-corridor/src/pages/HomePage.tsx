import React, { useCallback, useState } from "react";
import { SearchInput, SearchInputProps } from "ol-search-ui";
import { useHistory } from "react-router";
import { Link } from "react-router-dom";
import { useFieldsList } from "../api/fields";
import * as urls from "./urls";

const HomePage: React.FC = () => {
  const [searchText, setSearchText] = useState("");
  const history = useHistory();
  const onSearchClear = useCallback(() => setSearchText(""), []);
  const onSearchChange: SearchInputProps["onChange"] = useCallback((e) => {
    setSearchText(e.target.value);
  }, []);
  const onSearchSubmit = useCallback(() => {
    history.push(`/infinite/search?q=${searchText}`);
  }, [searchText, history]);

  const fieldsList = useFieldsList();

  return (
    <div className="page-content one-column homepage">
      <h1 className="page-title">Lorem ipsum dolor sit amet</h1>
      <SearchInput
        value={searchText}
        placeholder="Search for online courses or programs at MIT"
        onSubmit={onSearchSubmit}
        onClear={onSearchClear}
        onChange={onSearchChange}
        className="homepage-search main-search"
        classNameSubmit="primary bordered"
      />
      <h2>Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed...</h2>
      <ul className="field-list">
        {fieldsList.data?.results.map((field) => (
          <li key={field.name}>
            <Link className="field-link" to={urls.makeFieldViewPath(field.name)}>
              <figure>
                <img src="https://images.dog.ceo/breeds/eskimo/n02109961_6778.jpg"/>
                <figcaption className="field-title">{field.title}</figcaption>
              </figure>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default HomePage;
